#include "eosdtorclize.hpp"
#include "../dappservices/oracle.hpp"
#include "../dappservices/cron.hpp"

namespace eosdt {

//#ifdef TESTNET
    void  eosdtorclize::xgeturi(const ds_account &current_provider, const ds_account &package, const ds_uint &size,
                   const std::vector<char> &uri,const std::vector<char> &data) {
        //PRINT_STARTED("xgeturi")

        require_auth(current_provider);

        oracle_svc_helper svc_helper;
        svc_helper._oracle_geturi(size,uri,data,current_provider);
        oracle_svc_helper::sgeturi signal;
        if(current_provider != "eosdtproduce"_n){
            svc_helper.signal_svc("oracleservic"_n,current_provider,package,signal);
        }
        PRINT_FINISHED("xgeturi")
    }

    void  eosdtorclize::xorcclean(const ds_account &current_provider, const ds_account &package, const ds_uint &size,
                     const std::vector<char> &uri) {
        //PRINT_STARTED("xorcclean")
        require_auth(current_provider);

        oracle_svc_helper svc_helper;
        svc_helper._oracle_orcclean(size,uri,current_provider);
        oracle_svc_helper::sorcclean signal;
        if(current_provider != "eosdtproduce"_n){
            svc_helper.signal_svc("oracleservic"_n,current_provider,package,signal);
        }
        PRINT_FINISHED("xorcclean")
    }

    void  eosdtorclize::xsignal(const ds_account &service, const ds_account &action, const ds_account &provider, const ds_account &package,
                   const std::vector<char> &signalRawData) {
        //PRINT_STARTED("xsignal")

        require_auth(_self);

        oracle_svc_helper svc_helper;
        require_recipient(DAPPSERVICES_CONTRACT);
        PRINT_FINISHED("xsignal")
    }

    static void timer_callback(name timer, std::vector<char> payload, uint32_t seconds){
    }

    struct cron_svc_helper{
        CRON_DAPPSERVICE_ACTIONS
    };


    void  eosdtorclize::xschedule(const ds_account &current_provider,const ds_account &package,const ds_account &timer,
                     const std::vector<char> &payload, ds_uint seconds){
        //PRINT_STARTED("xschedule")
        vector<char> result;
        ds_symbol symbol;
        price_type ptype;
        ds_string query;

        require_auth(current_provider);
        if(current_provider != _self)
        {
            if (timer == "usd"_n) {
                query = "https+json://USD/min-api.cryptocompare.com/data/price?fsym=EOS&tsyms=USD";
                ptype = price_type::EOS_TO_SYMBOL;
                symbol = USD_SYMBOL;
            } else if (timer == "nut"_n) {
                query = "https+json://last/api.hitbtc.com/api/2/public/ticker/NUTEOS";
                ptype = price_type::SYMBOL_TO_EOS;
                symbol = UTILITY_SYMBOL;
            } else {
                ds_assert(false, "Wrong timer: %.", timer);
            }
            std::vector<char> uri(query.begin(), query.end());
            result = oracle_svc_helper::getURI(uri, [&](auto &results) {
                return results[0].result;
            });
        }

        auto settings = orasetting_get();
        auto interval = settings.delphioracle_interval;
        seconds = interval - time_get().sec_since_epoch() % interval;
        cron_svc_helper cron_svc_helper;
        cron_svc_helper.schedule_timer(timer,payload,seconds);

        if(!result.empty()) {
            ds_string result_str(result.begin(), result.end());
            rate_set(symbol, source_type::equilibriumdsp, ptype, result_str);
        }
        ds_print("\r\nquery: % symbol: % result: %", query, symbol, result);
        PRINT_FINISHED("xschedule")
    }

    void  eosdtorclize::orarecover()
    {
        //PRINT_STARTED("orarecover")

        require_auth(_self);

        ds_account provider;
        ds_account package_id;
        ds_account timer = "usd"_n;

        ds_string query = "https+json://last/api.hitbtc.com/api/2/public/ticker/EOSUSD";
        query = "https+json://USD/min-api.cryptocompare.com/data/price?fsym=EOS&tsyms=USD";
        std::vector<char> uri(query.begin(), query.end());
        auto result = oracle_svc_helper::getURI(uri,[&](auto &results) {
            provider = results[0].provider;
            return results[0].result;
        });
        //ds_print("\r\nresult: %, provider: %",result, provider);
        //ds_assert(provider.value!=0,"Provider did not found. Looks like this is wrong dsp node.");

//        const std::vector<char> payload;
//        cron_svc_helper cron_svc_helper;
//        cron_svc_helper.schedule_timer("nut"_n,payload,0);
//        cron_svc_helper.schedule_timer("usd"_n,payload,0);

        std::vector<char> payload;
        eosio::action(
                eosio::permission_level{_self, "active"_n},
                _self,
                "xschedule"_n,
                std::make_tuple(_self.value, "package"_n, "usd"_n, payload, 0U)
        ).send();

        eosio::action(
                eosio::permission_level{_self, "active"_n},
                _self,
                "xschedule"_n,
                std::make_tuple(_self.value, "package"_n, "nut"_n, payload, 0U)
        ).send();

        /*
        accountexts_t accountexts(DAPPSERVICES_CONTRACT, DAPPSERVICES_SYMBOL.code().raw());
        auto byExt = accountexts.get_index<"byext"_n>();
        for(auto itr = byExt.upper_bound((uint128_t{_self.value}<<64));
            itr != byExt.end() && itr->account == _self;itr++){
            if(itr->provider==provider) {
                ds_print("\r\nAccountExt: {Service: %, Provider: %, Quota: %, Balance: %, Package: %}",
                         itr->service, itr->provider, itr->quota, itr->balance, itr->package);
            }
        }
        typedef eosio::multi_index<"staking"_n, staking,indexed_by<"byprov"_n, const_mem_fun<staking, checksum256,
                        &staking::by_account_service_provider>>> staking_t;

        staking_t stakes(DAPPSERVICES_CONTRACT, _self.value);
        for(auto itr = stakes.begin();itr != stakes.end();itr++){
            if(itr->provider==provider) {
                ds_print("\r\nStakes: {Balance: %, Provider: %, Service: %}",
                         itr->balance, itr->provider, itr->service);
            }
        }
        typedef eosio::multi_index<"refunds"_n, refundreq,indexed_by<"byprov"_n,const_mem_fun<refundreq, checksum256,
                        &refundreq::by_symbol_service_provider>>> refunds_t;

        refunds_t refunds(DAPPSERVICES_CONTRACT, _self.value);
        for(auto itr = refunds.begin();itr != refunds.end();itr++){
            if(itr->provider==provider) {
                ds_print("\r\nRefund: {Amount: %, Provider: %, Service: %}",
                        itr->amount, itr->provider, itr->service);
            }
        }

        typedef eosio::multi_index<"package"_n, package,indexed_by<"bypkg"_n,const_mem_fun<package, checksum256,
                        &package::by_package_service_provider>>> packages_t;

        packages_t packages(DAPPSERVICES_CONTRACT, DAPPSERVICES_CONTRACT.value);
        for(auto itr = packages.begin();itr != packages.end();itr++){
            if(itr->provider==provider
                && (itr->service=="cronservices"_n || itr->service=="oracleservic"_n))
            {
                ds_print("\r\nPackage: {EndPoint: %, Uri: %, Package: %, Service: %, Provider: %, Quota: %}",
                         itr->api_endpoint,itr->package_json_uri,itr->package_id,itr->service,itr->provider,itr->quota);
            }
        }
        */
        /*
        if(provider.value != 0) {
            std::vector<char> payload;
            eosio::action(
                    eosio::permission_level{_self, "active"_n},
                    _self,
                    "xschedule"_n,
                    std::make_tuple(provider, package_id, timer, payload, 0U)
            ).send();
        }
        */

        PRINT_FINISHED("orarecover")
    }

//#endif
}