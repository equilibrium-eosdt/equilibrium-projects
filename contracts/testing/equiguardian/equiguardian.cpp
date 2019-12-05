#include "utils.hpp"
#include <math.h>

struct grdoper {
    ds_ulong operation_id;
    ds_account account;
    ds_asset initial_value;
    ds_asset liq_excess;
    ds_asset liq_value;
    ds_asset exchange_value;

    ds_ulong primary_key() const { return operation_id; }
};

enum class transfer_type : ds_int {
    INITIAL_VALUE = 0,
    LIQ_EXCESS,
    LIQ_VALUE,
    EXCHANGE_VALUE,
};

struct xchpair {
    ds_ulong pair_id;
    ds_symbol base_currency;
    ds_symbol quote_currency;
    ds_asset total_base_balance;
    ds_asset total_quote_balance;
    double buy_slippage;
    double sell_slippage;
    ds_symbol price_currency;
    ds_uint price_type;

    ds_ulong primary_key() const { return pair_id; }
};

typedef eosio::multi_index<"xchpairs"_n, xchpair> xchpairs_table;

class [[eosio::contract("equiguardian")]] equiguardian: public eosio::contract {

private:
    typedef eosio::multi_index<"grdopers"_n, grdoper> grdopers_table;

//    const ds_account liquidator_acc = "eosdtliqdatr"_n;
    const ds_account liquidator_acc = "fakeeliqdatr"_n;

    const ds_account exchange_acc = "eos2dtdotcom"_n;

    const ds_account eos_account = "eosio.token"_n;
    const ds_account eosdt_account = "eosdtsttoken"_n;

    const ds_ulong operation_id = 0;

    void print_operation(const grdoper &operation) {
        ds_print("\r\nopertion_id: %, account: %, initial_value: %, liq_excess: %, liq_value: %, exchange_value: %",
                 operation.operation_id,
                 operation.account,
                 operation.initial_value,
                 operation.liq_excess,
                 operation.liq_value,
                 operation.exchange_value
        );
    }

    std::optional <transfer_type> get_transfer_type(const ds_account &from,
                                                    const ds_account &to,
                                                    ds_asset &quantity,
                                                    const ds_string &memo) {
        PRINT_STARTED("gettranstype"_n)
        if (from == _self) {
            return std::nullopt;
        }

        std::optional <transfer_type> ret_val;

        if (from == liquidator_acc) {
            ds_assert(
                    quantity.symbol == STABLE_SYMBOL || quantity.symbol == EOS_SYMBOL,
                    "unknown asset received from liqdatr: %",
                    quantity
            );
            if (quantity.symbol == STABLE_SYMBOL) {
                ret_val = std::optional < transfer_type > {transfer_type::LIQ_EXCESS};
            } else {
                ret_val = std::optional < transfer_type > {transfer_type::LIQ_VALUE};
            }
        } else if (from == exchange_acc) {
            if (quantity.symbol == STABLE_SYMBOL) {
                ret_val = std::optional < transfer_type > {transfer_type::EXCHANGE_VALUE};
            } else {
                ds_print("Unknown asset received from exchange: %", quantity);
                ret_val = std::nullopt;
            }
        } else {
            ret_val = std::optional < transfer_type > {transfer_type::INITIAL_VALUE};
        }
        PRINT_FINISHED("gettranstype"_n)
        return ret_val;
    }

    void transfer_stable(const ds_asset &quantity, ds_account to, const ds_string &memo = "") {
        ds_assert(quantity.symbol == STABLE_SYMBOL, "asset must be %: %", STABLE_SYMBOL_STR, quantity);
        ds_print("\r\ntransferring % to % with memo: %", quantity, to, memo);
        eosio::action(
                eosio::permission_level{_self, "active"_n},
                EOSDTSTTOKEN,
                "transfer"_n,
                std::make_tuple(_self, to, quantity, memo)
        ).send();
    }

    void transfer_eos(const ds_asset &quantity, ds_account to, const ds_string &memo = "") {
        ds_assert(quantity.symbol == EOS_SYMBOL, "asset must be %: %", EOS_SYMBOL_STR, quantity);
        ds_print("\r\ntransferring % to % with memo: %", quantity, to, memo);
        eosio::action(
                eosio::permission_level{_self, "active"_n},
                EOSCTRACT,
                "transfer"_n,
                std::make_tuple(_self, to, quantity, memo)
        ).send();
    }

    void create_exchange_sell() {
        ds_print("\r\nsending action createxchng");
        eosio::action(
                eosio::permission_level{_self, "active"_n},
                _self,
                "createxchng"_n,
                std::make_tuple()
        ).send();
    }

    void transfer_back() {
        ds_print("\r\nsending action transferback");
        eosio::action(
                eosio::permission_level{_self, "active"_n},
                _self,
                "transferback"_n,
                std::make_tuple()
        ).send();
    }

    void on_initial_value_transfer(
            const ds_account &from,
            const ds_account &to,
            ds_asset &quantity,
            const ds_string &memo
    ) {
        PRINT_STARTED("inittransfer"_n)

        ds_assert(quantity.symbol == STABLE_SYMBOL, "asset must be eosdt: %", quantity);

        grdopers_table grdopers(_self, _self.value);
        auto avail_operation_id = grdopers.available_primary_key();

        ds_assert(avail_operation_id == operation_id, "another guardian operation is already executing");

        grdopers.emplace(_self, [&](auto &row) {
            row.operation_id = operation_id;
            row.account = from;
            row.initial_value = quantity;
            row.liq_excess = ds_asset(0, STABLE_SYMBOL);
            row.liq_value = ds_asset(0, EOS_SYMBOL);
            row.exchange_value = ds_asset(0, STABLE_SYMBOL);
        });

        auto itr = grdopers.find(operation_id);
        ds_assert(itr != grdopers.end(), "guardian operation is not started");
        print_operation(*itr);

        transfer_stable(quantity, liquidator_acc);
        create_exchange_sell();
        transfer_back();
        PRINT_FINISHED("inittransfer"_n)
    }

    void on_liq_excess_transfer(
            const ds_account &from,
            const ds_account &to,
            ds_asset &quantity,
            const ds_string &memo
    ) {
        PRINT_STARTED("liqexcesstrn"_n)
        ds_assert(quantity.symbol == STABLE_SYMBOL, "asset must be eosdt: %", quantity);

        grdopers_table grdopers(_self, _self.value);
        auto itr = grdopers.find(operation_id);
        ds_assert(itr != grdopers.end(), "guardian operation is not started");

        ds_print("\r\noperation row before:");
        print_operation(*itr);

        grdopers.modify(itr, _self, [&](auto &row) {
            row.liq_excess = quantity;
        });

        ds_print("\r\noperation row after:");
        print_operation(*itr);

        PRINT_FINISHED("liqexcesstrn"_n)
    }

    void on_liq_value_transfer(
            const ds_account &from,
            const ds_account &to,
            ds_asset &quantity,
            const ds_string &memo
    ) {
        PRINT_STARTED("liqvaluetrn"_n)
        ds_assert(quantity.symbol == EOS_SYMBOL, "asset must be eos: %", quantity);

        grdopers_table grdopers(_self, _self.value);
        auto itr = grdopers.find(operation_id);
        ds_assert(itr != grdopers.end(), "guardian operation is not started");

        ds_print("\r\noperation row before:");
        print_operation(*itr);

        grdopers.modify(itr, _self, [&](auto &row) {
            row.liq_value = quantity;
        });

        ds_print("\r\noperation row after:");
        print_operation(*itr);

        PRINT_FINISHED("liqvaluetrn"_n)
    }

    void on_exchange_value_transfer(
            const ds_account &from,
            const ds_account &to,
            ds_asset &quantity,
            const ds_string &memo
    ) {
        PRINT_STARTED("xchvaltrn"_n)
        ds_assert(quantity.symbol == STABLE_SYMBOL, "asset must be eosdt: %", quantity);

        grdopers_table grdopers(_self, _self.value);
        auto itr = grdopers.find(operation_id);
        ds_assert(itr != grdopers.end(), "guardian operation is not started");

        ds_print("\r\noperation row before:");
        print_operation(*itr);

        grdopers.modify(itr, _self, [&](auto &row) {
            row.exchange_value += quantity;
        });

        ds_print("\r\noperation row after:");
        print_operation(*itr);

        PRINT_FINISHED("xchvaltrn"_n)
    }

    ds_ulong find_exchange_pair_id(ds_symbol base_symbol, ds_symbol quote_symbol) {
        xchpairs_table pairs(exchange_acc, exchange_acc.value);
        for (auto itr = pairs.begin(); itr != pairs.end(); itr++) {
            if (itr->base_currency == base_symbol && itr->quote_currency == quote_symbol) {
                return itr->pair_id;
            }
        }

        ds_assert(false, "pair %/% is not found",
                base_symbol.code().to_string(),
                quote_symbol.code().to_string());
        return 0;
    }

    std::optional<ds_account> get_symbol_acc(const ds_symbol &symbol) {
        if (symbol == STABLE_SYMBOL) {
            return eosdt_account;
        } else if (symbol == EOS_SYMBOL) {
            return eos_account;
        } else {
            return {};
        }
    }

public:
    equiguardian(ds_account receiver, ds_account code, eosio::datastream<const char *> ds) :
            eosio::contract(receiver, code, ds) {
    }

    void transfer(const ds_account &from,
                  const ds_account &to,
                  ds_asset &quantity,
                  const ds_string &memo) {
        PRINT_STARTED("transfer"_n)

        ds_print("\r\ntransfer params: from: %, to: %, quantity: %, memo: %",
                 from,
                 to,
                 quantity,
                 memo
        );

        ds_assert(quantity.amount > 0, "amount must be greater than zero: %", quantity);

        auto type = get_transfer_type(from, to, quantity, memo);

        if (!type) {
            ds_print("\r\nignoring transfer");
        } else {
            ds_print("\r\ntransfer type is %", static_cast<ds_int>(*type));

            std::optional<ds_account> symbol_acc = get_symbol_acc(quantity.symbol);

            if (!symbol_acc) {
                ds_assert(false, "unknown symbol: %", quantity.symbol);
            } else {
                ds_assert(get_first_receiver() == symbol_acc,
                          "wrong first receiver: %. expected: %",
                          get_first_receiver(),
                          *symbol_acc);
            }

            switch (*type) {
                case transfer_type::INITIAL_VALUE:
                    on_initial_value_transfer(from, to, quantity, memo);
                    break;
                case transfer_type::LIQ_EXCESS:
                    on_liq_excess_transfer(from, to, quantity, memo);
                    break;
                case transfer_type::LIQ_VALUE:
                    on_liq_value_transfer(from, to, quantity, memo);
                    break;
                case transfer_type::EXCHANGE_VALUE:
                    on_exchange_value_transfer(from, to, quantity, memo);
                    break;
                default:
                    ds_assert(false, "unknown transfer_type: %", static_cast<int>(*type));
            }
        }

        PRINT_FINISHED("transfer"_n)
    }

    ACTION createxchng() {
        PRINT_STARTED("createxchng"_n)

        require_auth(_self);

        grdopers_table grdopers(_self, _self.value);
        auto itr = grdopers.find(operation_id);
        ds_assert(itr != grdopers.end(), "guardian operation is not started");

        print_operation(*itr);

        ds_assert(itr->initial_value.symbol == STABLE_SYMBOL, "initial_value must be EOSDT: %", itr->initial_value);
        ds_assert(itr->liq_excess.symbol == STABLE_SYMBOL, "liq_excess must be EOSDT: %", itr->liq_excess);
        ds_assert(itr->liq_value.symbol == EOS_SYMBOL, "liq_value must be EOS: %", itr->liq_value);

        ds_assert(itr->liq_excess.amount >= 0, "invalid liq_excess value: %", itr->liq_excess);
        ds_assert(itr->liq_value.amount > 0, "invalid liq_value: %", itr->liq_value);
        ds_assert((itr->initial_value - itr->liq_excess).amount > 0, "nothing to send to exchange");

        ds_ulong pair_id = find_exchange_pair_id(EOS_SYMBOL, STABLE_SYMBOL);
        ds_string pair_id_str = std::to_string(pair_id);
        ds_string exchange_memo = "{\"pair_id\":" + pair_id_str + "}";
        ds_print("\r\nexchange_memo: %", exchange_memo);

        ds_asset quantity = itr->liq_value;
        transfer_eos(quantity, exchange_acc, exchange_memo);

        PRINT_FINISHED("createxchng"_n)
    }

    ACTION transferback() {
        PRINT_STARTED("transferback"_n)

        require_auth(_self);

        grdopers_table grdopers(_self, _self.value);
        auto itr = grdopers.find(operation_id);
        ds_assert(itr != grdopers.end(), "guardian operation is not started");

        print_operation(*itr);

        ds_assert(itr->initial_value.symbol == STABLE_SYMBOL, "initial_value must be EOSDT: %", itr->initial_value);
        ds_assert(itr->liq_excess.symbol == STABLE_SYMBOL, "liq_excess must be EOSDT: %", itr->liq_excess);
        ds_assert(itr->liq_value.symbol == EOS_SYMBOL, "liq_value must be EOS: %", itr->liq_value);
        ds_assert(itr->exchange_value.symbol == STABLE_SYMBOL, "exchange_value must be EOSDT: %", itr->exchange_value);

        ds_assert(itr->liq_excess.amount >= 0, "invalid liq_excess value: %", itr->liq_excess);
        ds_assert(itr->liq_value.amount > 0, "invalid liq_value: %", itr->liq_value);
        ds_assert(itr->exchange_value.amount > 0, "invalid exchange_value: %", itr->exchange_value);

        auto before_value = itr->initial_value - itr->liq_excess;

        ds_print("\r\nbefore_value: %, after_value: %", before_value, itr->exchange_value);
        ds_assert(before_value <= itr->exchange_value, "bad conditions. before: %, after: %", before_value, itr->exchange_value);

        ds_asset val_to_transfer = itr->liq_excess + itr->exchange_value;
        transfer_stable(val_to_transfer, itr->account);

        grdopers.erase(itr);

        PRINT_FINISHED("transferback"_n)
    }
};

#define EOSIO_DISPATCH_EX(TYPE, MEMBERS) \
extern "C" { \
   void apply( ds_ulong receiver, ds_ulong code, ds_ulong action ) { \
        if( code != receiver && action != "transfer"_n.value)return;\
        switch( action ) {EOSIO_DISPATCH_HELPER( TYPE, MEMBERS )} \
   } \
} \

EOSIO_DISPATCH_EX(equiguardian, (transfer)(createxchng)(transferback))

