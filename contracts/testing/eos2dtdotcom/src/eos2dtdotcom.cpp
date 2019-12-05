#define EOSDTCURRENT "eos2dtdotcom"_n
#include "info.hpp"
#include "../../eosdt/eosdt.hpp"
#include "json_parser.hpp"

struct xchsetting {
    ds_ulong setting_id;
    ds_account oraclize_account;
    ds_int rate_timeout;
    ds_ulong next_trade_id;

    ds_ulong primary_key() const { return setting_id; }
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
    ds_account manager_account;
    ds_asset price;

    ds_ulong primary_key() const { return pair_id; }
};

struct xchtoken {
    ds_symbol token_symbol;
    ds_account token_account;

    ds_ulong primary_key() const { return token_symbol.raw(); }
};

struct orarate {
    ds_asset rate;
    ds_time update;

    uint64_t primary_key() const {
        return rate.symbol.raw();
    }
};

typedef eosio::multi_index<"xchsettings"_n, xchsetting> xchsettings_table;
typedef eosio::multi_index<"xchpairs"_n, xchpair> xchpairs_table;
typedef eosio::multi_index<"xchtokens"_n, xchtoken> xchtokens_table;
typedef eosio::multi_index<"orarates"_n, orarate> orarates_table;

enum class PriceType : ds_uint {
    direct = 0,
    inverse = 1,
    manual = 2
};

PriceType uint32_to_price_type(ds_uint value) {
    ds_assert(value >= 0 && value <= 2, "value is out of range: %", value);
    return static_cast<PriceType>(value);
}

ds_uint price_type_to_uint32(PriceType value) {
    return static_cast<ds_uint>(value);
}

enum class PriceDirection {
    direct,
    inverse
};

struct log_item {
    ds_ulong pair_id;
    double trade_price;
    ds_asset quantity;
    ds_account buy_account;
    ds_account sell_account;
    ds_ulong trade_id;
    ds_time trade_time;
};

class [[eosio::contract("eos2dtdotcom")]] eos2dtdotcom : public eosio::contract {
private:
    xchsetting settingget() {
        xchsettings_table settings(_self, _self.value);
        auto itr = settings.find(0);
        ds_assert(itr != settings.end(), "settings not found");
        return *itr;
    }

    auto time_get() {
        auto time = ds_time(eosio::current_time_point().sec_since_epoch());
#ifdef TESTNET
        struct ctrsetting {
            ds_ulong setting_id;
            uint8_t global_lock;
            ds_long time_shift;

            ds_ulong primary_key() const { return setting_id; }
        };

        typedef eosio::multi_index<"ctrsettings"_n, ctrsetting> ctrsettings_table;

        auto ctr = EOSDTCNTRACT;
        ctrsettings_table ctrsettings(ctr, ctr.value);
        auto itr = ctrsettings.find(0);

        if (itr == ctrsettings.end()) {
            ds_print("\r\ntime_get: no settings found");
        }

        return time + (itr == ctrsettings.end() ? 0 : itr->time_shift);
#else
        return time;
#endif
    }

    xchtoken get_token(ds_symbol symbol) {
        xchtokens_table tokens(_self, _self.value);
        auto itr = tokens.find(symbol.raw());
        ds_assert(itr != tokens.end(), "token not found: %", symbol);
        return *itr;
    }

    xchpair get_pair(ds_ulong pair_id) {
        xchpairs_table pairs(_self, _self.value);
        auto itr = pairs.find(pair_id);
        ds_assert(itr != pairs.end(), "pair not found: %", pair_id);
        return *itr;
    }

    void require_manager_auth(const ds_ulong pair_id) {
        require_auth(get_pair(pair_id).manager_account);
    }

    ds_ulong parse_pair_id(const ds_string &json) {
        json_parser::k_v_map key_values;

        key_values.insert(json_parser::k_v_pair("pair_id", json_parser::VALUE_INT));

        auto parser = json_parser(json.c_str(), key_values);
        auto parse_status = parser.parse();

        ds_int pair_id;
        bool pair_id_specified;

        for (; parse_status == json_parser::STATUS_OK; parse_status = parser.parse()) {
            if (parser.is_key_equals("pair_id")) {
                pair_id = parser.get_out_int();
                pair_id_specified = true;
            }
        }
        ds_assert(parse_status == json_parser::STATUS_END, "json is invalid, code: %", parse_status);
        ds_assert(pair_id_specified, "pair_id is required");

        ds_assert(pair_id >= 0, "pair_id(%) must be non-negative", pair_id);

        return pair_id;
    }

    void trans(const ds_account &to, const ds_asset &quantity, const ds_string &memo) {
        PRINT_STARTED("trans")
        xchtoken token = get_token(quantity.symbol);
        ds_account token_acc = token.token_account;
        ds_print("\r\ntrans: {from: %, to: %, quantity: % ,by: %, memo: '%'}",
                 _self, to, quantity, token_acc, memo);
        ds_assert(quantity.amount > 0, "quantity must be greater than zero: %", quantity);
        eosio::action(
                eosio::permission_level{_self, "active"_n},
                token_acc,
                "transfer"_n,
                std::make_tuple(_self, to, quantity, memo)
        ).send();
        PRINT_FINISHED("trans")
    }

    double get_price(ds_ulong pair_id, PriceDirection price_direction) {
        xchpair pair = get_pair(pair_id);
        PriceType price_type = uint32_to_price_type(pair.price_type);

        if (price_type == PriceType::manual) {
            ds_assert(pair.price.symbol == pair.quote_currency, "wrong symbol of manual price: %, must be %", pair.price.symbol, pair.quote_currency);
            ds_assert(pair.price > ds_asset(0, pair.quote_currency), "manual price must be greater than 0");
            double price = to_double(pair.price);

            return price_direction == PriceDirection::direct ? price : 1 / price;
        } else {
            auto settings = settingget();
            ds_account ora_acc = settings.oraclize_account;

            orarates_table rates(ora_acc, ora_acc.value);
            auto itr = rates.find(pair.price_currency.raw());
            ds_assert(itr != rates.end(), "symbol % not found in orarates", pair.price_currency);

            auto min_time = time_get() - settings.rate_timeout;
            ds_assert(itr->update >= min_time, "rate is outdated");

            double ora_rate = to_double(itr->rate);

            if ((price_type == PriceType::direct && price_direction == PriceDirection::direct) ||
                (price_type == PriceType::inverse && price_direction == PriceDirection::inverse)) {
                return ora_rate;
            } else {
                return 1 / ora_rate;
            }
        }
    }

    ds_ulong get_and_increase_trade_id() {
        xchsettings_table settings(_self, _self.value);
        auto itr = settings.find(0);
        ds_assert(itr != settings.end(), "settings not found");

        ds_ulong trade_id = itr->next_trade_id;

        settings.modify(itr, _self, [&](auto &row) {
            row.next_trade_id++;
        });

        return trade_id;
    }

    void log_exchange(const log_item &item) {
        eosio::action(
                eosio::permission_level{_self, "active"_n},
                _self,
                "logxchop"_n,
                std::make_tuple(
                        item.pair_id,
                        item.trade_price,
                        item.quantity,
                        item.buy_account,
                        item.sell_account,
                        item.trade_id,
                        item.trade_time
                        )
                ).send();
    }

public:
    eos2dtdotcom(ds_account receiver, ds_account code, eosio::datastream<const char *> ds) :
            eosio::contract(receiver, code, ds) {
    }

    void transfer(const ds_account &from,
                  const ds_account &to,
                  ds_asset &quantity,
                  const ds_string &memo) {
        PRINT_STARTED("transfer"_n)

        if (to != _self) {
            PRINT_FINISHED("transfer"_n)
            return;
        }

        ds_account token_account = get_token(quantity.symbol).token_account;
        ds_assert(get_first_receiver() == token_account,
                  "Wrong contract % for asset: % expected: %.",
                  get_first_receiver(), quantity,
                  token_account);

        ds_ulong pair_id = parse_pair_id(memo);
        xchpairs_table xchpairs(_self, _self.value);
        auto itr = xchpairs.find(pair_id);
        ds_assert(itr != xchpairs.end(), "wrong pair_id %", pair_id);

        if (from == itr->manager_account) {
            if (quantity.symbol == itr->base_currency) {
                xchpairs.modify(itr, _self, [&](auto &row) {
                    row.total_base_balance += quantity;
                });
            } else if (quantity.symbol == itr->quote_currency) {
                xchpairs.modify(itr, _self, [&](auto &row) {
                    row.total_quote_balance += quantity;
                });
            } else {
                ds_assert(false, "wrong quantity symbol %", quantity.symbol);
            }
        } else {
            if (quantity.symbol == itr->quote_currency) { // buy
                ds_assert(itr->total_base_balance.amount > 0,
                        "total base balance for pair % is zero",
                        itr->pair_id);

                double inv_price = get_price(pair_id, PriceDirection::inverse);

                ds_asset quote_quantity_asset = quantity;
                double quote_quantity = to_double(quote_quantity_asset);
                double base_quantity = quote_quantity * inv_price / (1 + itr->buy_slippage);
                ds_asset base_quantity_asset = op_mul_floor(
                        ds_asset(pow(10.0, itr->base_currency.precision()), itr->base_currency),
                        base_quantity);

                ds_asset base_excess = itr->total_base_balance - base_quantity_asset;

                ds_assert(base_excess.amount >= 0, "not enough balance. available: %, required: %",
                        itr->total_base_balance,
                        base_quantity_asset);

                trans(from, base_quantity_asset, "exchange");

                xchpairs.modify(itr, _self, [&](auto &row) {
                    row.total_quote_balance += quote_quantity_asset;
                    row.total_base_balance -= base_quantity_asset;
                });

                log_exchange({
                        .pair_id = pair_id,
                        .trade_price = (1 + itr->buy_slippage) / inv_price,
                        .quantity = base_quantity_asset,
                        .buy_account = from,
                        .sell_account = _self,
                        .trade_id = get_and_increase_trade_id(),
                        .trade_time = time_get(),
                });

            } else if (quantity.symbol == itr->base_currency) { // sell
                ds_assert(itr->total_quote_balance.amount > 0,
                        "total quote balance for pair % is zero",
                        itr->pair_id);

                double price = get_price(pair_id, PriceDirection::direct);

                ds_asset base_quantity_asset = quantity;
                double base_quantity = to_double(base_quantity_asset);
                double quote_quantity = base_quantity * price * (1 - itr->sell_slippage);
                ds_asset quote_quantity_asset = op_mul_floor(
                        ds_asset(pow(10.0, itr->quote_currency.precision()), itr->quote_currency),
                        quote_quantity);

                ds_asset quote_excess = itr->total_quote_balance - quote_quantity_asset;

                ds_assert(quote_excess.amount >= 0, "not enough balance. available: %, required: %",
                          itr->total_quote_balance,
                          quote_quantity_asset);

                trans(from, quote_quantity_asset, "exchange");

                xchpairs.modify(itr, _self, [&](auto &row) {
                    row.total_base_balance += base_quantity_asset;
                    row.total_quote_balance -= quote_quantity_asset;
                });

                log_exchange({
                        .pair_id = pair_id,
                        .trade_price = (1 - itr->sell_slippage) * price,
                        .quantity = base_quantity_asset,
                        .buy_account = _self,
                        .sell_account = from,
                        .trade_id = get_and_increase_trade_id(),
                        .trade_time = time_get()
                });
            } else {
                ds_assert(false, "invalid quantity symbol (%) for pair (%)", quantity, pair_id);
            }
        }
        PRINT_FINISHED("transfer"_n)
    }

    void settingset(ds_account oraclize_account, ds_int rate_timeout) {
        PRINT_STARTED("settingset"_n)
        require_auth(_self);

        ds_assert(rate_timeout > 0, "rate_timeout must be greater than zero: %", rate_timeout);

        xchsettings_table settings(_self, _self.value);
        const auto set = [&](auto &row) {
            row.setting_id = 0;
            row.oraclize_account = oraclize_account;
            row.rate_timeout = rate_timeout;
        };

        auto itr = settings.find(0);
        if (itr == settings.end()) {
            settings.emplace(_self, set);
        } else {
            settings.modify(itr, _self, set);
        }
        PRINT_FINISHED("settingset"_n)
    }

    void addpair(
            ds_symbol base_currency,
            ds_symbol quote_currency,
            double buy_slippage,
            double sell_slippage,
            ds_symbol price_currency,
            ds_uint price_type,
            ds_account manager_account) {
        PRINT_STARTED("addpair"_n)
        require_auth(_self);

        ds_assert(buy_slippage >= 0, "buy_slippage must be non-negative");
        ds_assert(sell_slippage >= 0, "sell_slippage must be non-negative");

        PriceType type = uint32_to_price_type(price_type);

        xchpairs_table pairs(_self, _self.value);
        auto pair_id = pairs.available_primary_key();

        pairs.emplace(_self, [&](auto &row) {
            row.pair_id = pair_id;
            row.base_currency = base_currency;
            row.quote_currency = quote_currency;
            row.total_base_balance = ds_asset(0, base_currency);
            row.total_quote_balance = ds_asset(0, quote_currency);
            row.buy_slippage = buy_slippage;
            row.sell_slippage = sell_slippage;
            row.price_currency = price_currency;
            row.price_type = price_type_to_uint32(type);
            row.manager_account = manager_account;
        });

        PRINT_FINISHED("addpair"_n)
    }

    void updatepair(ds_ulong pair_id, double buy_slippage, double sell_slippage) {
        PRINT_STARTED("updatepair"_n)
        require_manager_auth(pair_id);

        ds_assert(buy_slippage >= 0, "buy_slippage must be non-negative");
        ds_assert(sell_slippage >= 0, "sell_slippage must be non-negative");

        xchpairs_table pairs(_self, _self.value);
        auto itr = pairs.find(pair_id);

        ds_assert(itr != pairs.end(), "wrong pair_id %", pair_id);

        pairs.modify(itr, _self, [&](auto &row) {
            row.buy_slippage = buy_slippage;
            row.sell_slippage = sell_slippage;
        });

        PRINT_FINISHED("updatepair"_n)
    }

    void deletepair(ds_ulong pair_id) {
        PRINT_STARTED("deletepair"_n)
        require_auth(_self);

        xchpairs_table pairs(_self, _self.value);
        auto itr = pairs.find(pair_id);

        ds_assert(itr != pairs.end(), "wrong pair_id %", pair_id);

        ds_assert(itr->total_base_balance == ds_asset(0, itr->base_currency), "total_base_balance must be 0");
        ds_assert(itr->total_quote_balance == ds_asset(0, itr->quote_currency), "total_quote_balance must be 0");

        pairs.erase(itr);

        PRINT_FINISHED("deletepair"_n)
    }

    void withdraw(ds_account to, ds_ulong pair_id, ds_asset quantity, ds_string &memo) {
        PRINT_STARTED("withdraw"_n)
        require_manager_auth(pair_id);

        xchpairs_table xchpairs(_self, _self.value);
        auto itr = xchpairs.find(pair_id);
        ds_assert(itr != xchpairs.end(), "wrong pair_id %", pair_id);
        if (quantity.symbol == itr->base_currency) {
            ds_assert(quantity <= itr->total_base_balance,
                    "can not withdraw more than total_base_balance. required: %, available: %",
                    quantity,
                    itr->total_base_balance);

            xchpairs.modify(itr, _self, [&](auto &row) {
                row.total_base_balance -= quantity;
            });

            trans(to, quantity, memo);
        } else if (quantity.symbol == itr->quote_currency) {
            ds_assert(quantity <= itr->total_quote_balance,
                      "can not withdraw more than total_quote_balance. required: %, available: %",
                      quantity,
                      itr->total_quote_balance);

            xchpairs.modify(itr, _self, [&](auto &row) {
                row.total_quote_balance -= quantity;
            });

            trans(to, quantity, memo);
        } else {
            ds_assert(false, "wrong quantity symbol %", quantity.symbol);
        }
        PRINT_FINISHED("withdraw"_n)
    }

    void addtoken(ds_symbol token_symbol, ds_account token_account) {
        PRINT_STARTED("addtoken"_n)
        require_auth(_self);

        xchtokens_table tokens(_self, _self.value);
        const auto set = [&](auto &row) {
            row.token_symbol = token_symbol;
            row.token_account = token_account;
        };

        auto itr = tokens.find(token_symbol.raw());
        if (itr == tokens.end()) {
            tokens.emplace(_self, set);
        } else {
            tokens.modify(itr, _self, set);
        }
        PRINT_FINISHED("addtoken"_n)
    }

    void deletetoken(ds_symbol token_symbol) {
        PRINT_STARTED("deletetoken"_n)
        require_auth(_self);

        xchtokens_table tokens(_self, _self.value);
        auto itr = tokens.find(token_symbol.raw());

        ds_assert(itr != tokens.end(), "wrong token_symbol %", token_symbol);

        // todo: check if token is still used in some pairs

        tokens.erase(itr);

        PRINT_FINISHED("deletetoken"_n)
    }

#ifdef DELETEDATA
    void deletesttngs() {
        PRINT_STARTED("deletesttngs"_n);
        require_auth(_self);
        struct xchsetting_del {
            ds_ulong setting_id;
            ds_account oraclize_account;
            ds_account manager_account;
            ds_int rate_timeout;

            ds_ulong primary_key() const { return setting_id; }
        };

        eosio::multi_index<"xchsettings"_n, xchsetting_del> settings(_self, _self.value);
        for (auto itr = settings.begin(); itr != settings.end(); itr = settings.erase(itr));
        PRINT_FINISHED("deletesttngs"_n);
    }

    void deletepairs() {
        PRINT_STARTED("deletepairs"_n);
        require_auth(_self);
        struct xchpair_del {
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

        eosio::multi_index<"xchpairs"_n, xchpair_del> pairs(_self, _self.value);
        for (auto itr = pairs.begin(); itr != pairs.end(); itr = pairs.erase(itr));
        PRINT_FINISHED("deletepairs"_n);
    }

    void deletetokens() {
        PRINT_STARTED("deletetokens"_n);
        require_auth(_self);
        struct xchtoken_del {
            ds_symbol token_symbol;
            ds_account token_account;

            ds_ulong primary_key() const { return token_symbol.raw(); }
        };

        eosio::multi_index<"xchtokens"_n, xchtoken_del> tokens(_self, _self.value);
        for (auto itr = tokens.begin(); itr != tokens.end(); itr = tokens.erase(itr));
        PRINT_FINISHED("deletetokens"_n);
    }

    void deletedata() {
        PRINT_STARTED("deletedata"_n);
        require_auth(_self);
        deletesttngs();
        deletepairs();
        deletetokens();
        PRINT_FINISHED("deletedata"_n);
    }
#endif

    void logxchop(
        ds_ulong pair_id,
        double trade_price,
        ds_asset quantity,
        ds_account buy_account,
        ds_account sell_account,
        ds_ulong trade_id,
        ds_time trade_time
    ) {
        // intentionally empty
    }

    void setprice(ds_ulong pair_id, ds_asset price) {
        require_manager_auth(pair_id);

        xchpairs_table pairs(_self, _self.value);
        auto itr = pairs.find(pair_id);
        ds_assert(itr != pairs.end(), "wrong pair_id %", pair_id);

        ds_assert(price.symbol == itr->quote_currency, "wrong symbol of manual price: %, must be %", price.symbol, itr->quote_currency);
        ds_assert(price > ds_asset(0, itr->quote_currency), "manual price must be greater than 0");

        pairs.modify(itr, _self, [&](auto &row) {
            row.price = price;
        });
    }
};

EOSIO_DISPATCH_EX(eos2dtdotcom, (transfer)
(settingset)(addpair)(updatepair)(deletepair)(withdraw)(addtoken)(deletetoken)
#ifdef DELETEDATA
(deletesttngs)
(deletepairs)
(deletetokens)
(deletedata)
#endif
(logxchop)(setprice)
)

