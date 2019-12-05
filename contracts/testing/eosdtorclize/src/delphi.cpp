#include "eosdtorclize.hpp"

namespace eosdt {

    void eosdtorclize::delphirefres() {
        PRINT_STARTED("delphirefres"_n)

        struct datapoint {
            ds_ulong id;
            ds_account owner;
            ds_ulong value;
            ds_ulong median;
            ds_ulong timestamp;

            ds_ulong primary_key() const { return id; }
        };

        {
            eosio::multi_index<"datapoints"_n, datapoint> delphi_datapoint("delphioracle"_n, "eosusd"_n.value);
            auto itr = delphi_datapoint.crbegin();
            if (itr == delphi_datapoint.crend()) {
                ds_print("\r\ntable datapoints(delphioracle) for eosusd is empty.");
            } else {
                auto median = ds_asset(itr->median*pow(10.0, USD_SYMBOL_DECIMAL-4),USD_SYMBOL);
                ds_print("\r\ndelphioracle median: % (%).", itr->median, median);
                rate_set(source_type::delphioracle, price_type::EOS_TO_SYMBOL, median);
            }
        }
        {
            eosio::multi_index<"datapoints"_n, datapoint> eostitan_datapoint("delphioracle"_n, "eosnut"_n.value);
            auto itr = eostitan_datapoint.crbegin();
            if (itr == eostitan_datapoint.crend()) {
                ds_print("\r\ntable datapoints(delphioracle) for eosnut is empty.");
            } else {
                auto median = ds_asset(itr->median*pow(10.0, UTILITY_SYMBOL_DECIMAL-4),UTILITY_SYMBOL);
                ds_print("\r\ndelphioracle median: % (%).", itr->median, median);
                rate_set(source_type::delphioracle, price_type::EOS_TO_SYMBOL, median);
            }
        }

        PRINT_FINISHED("delphirefres"_n)

    }
}