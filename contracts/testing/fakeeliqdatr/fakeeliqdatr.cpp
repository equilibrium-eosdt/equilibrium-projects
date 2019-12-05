#include "utils.hpp"

struct fkeparameter {
    ds_ulong parameter_id;
    ds_asset surplus_debt;
    ds_asset bad_debt;
    double rate;

    ds_ulong primary_key() const { return parameter_id; }
};

typedef eosio::multi_index<"parameters"_n, fkeparameter> fkeparameters_table;

class [[eosio::contract("fakeeliqdatr")]] fakeeliqdatr : public eosio::contract {
public:
    fakeeliqdatr(ds_account receiver, ds_account code, eosio::datastream<const char *> ds) :
            eosio::contract(receiver, code, ds) {
    }

    void transfer(const ds_account &from,
                  const ds_account &to,
                  ds_asset &quantity,
                  const ds_string &memo) {
        PRINT_STARTED("transfer"_n)

        ds_print("\r\nmemo: %", memo);

        if (memo == "ignore this transfer") {
            return;
        }

        if (to != _self) {
            return;
        }

        ds_assert(quantity.symbol == STABLE_SYMBOL, "wrong quantity symbol: %", quantity.symbol);

        fkeparameters_table fkeparameters(_self, _self.value);
        auto itr = fkeparameters.find(0);

        ds_asset avail_value = itr-> bad_debt - itr-> surplus_debt;

        ds_assert(avail_value > ds_asset(0, STABLE_SYMBOL), "not enough bad debt: %", avail_value);

        ds_print("\r\navail_value = %", avail_value);

        ds_asset work_quantity;
        if (avail_value.amount < quantity.amount) {
            work_quantity = avail_value;

            ds_asset excess = quantity - avail_value;
            eosio::action(
                    eosio::permission_level{_self, "active"_n},
                    EOSDTSTTOKEN,
                    "transfer"_n,
                    std::make_tuple(_self, from, excess, ds_string("excess"))
            ).send();
        } else {
            work_quantity = quantity;
        }
        ds_print("\r\nwork_quantity: %", work_quantity);

        double eos_amount = to_double(work_quantity) * itr->rate;
        ds_asset eos_asset = ds_asset(pow(10.0, EOS_SYMBOL_DECIMAL) * eos_amount, EOS_SYMBOL);

        eosio::action(
                eosio::permission_level{_self, "active"_n},
                EOSCTRACT,
                "transfer"_n,
                std::make_tuple(_self, from, eos_asset, ds_string("colaterlauct"))
        ).send();

        auto set = [&](auto &row) {
            row.surplus_debt += work_quantity;
        };
        fkeparameters.modify(itr, _self, set);
        PRINT_FINISHED("transfer"_n)
    }

    void setparams(ds_asset surplus_debt, ds_asset bad_debt, double rate) {
        PRINT_STARTED("setparams"_n)
        require_auth(_self);

        fkeparameters_table fkeparameters(_self, _self.value);
        auto itr = fkeparameters.find(0);

        auto set = [&](auto &row) {
            row.parameter_id = 0;
            row.surplus_debt = surplus_debt;
            row.bad_debt = bad_debt;
            row.rate = rate;
        };

        if (itr == fkeparameters.end()) {
            fkeparameters.emplace(_self, set);
        } else {
            fkeparameters.modify(itr, _self, set);
        }
        PRINT_FINISHED("setparams"_n)
    }
};

#define EOSIO_DISPATCH_EX(TYPE, MEMBERS) \
extern "C" { \
   void apply( ds_ulong receiver, ds_ulong code, ds_ulong action ) { \
        if( code != receiver && action != "transfer"_n.value)return;\
        switch( action ) {EOSIO_DISPATCH_HELPER( TYPE, MEMBERS )} \
   } \
} \

EOSIO_DISPATCH_EX(fakeeliqdatr, (transfer)(setparams))

