#include "eosdtorclize.hpp"

#include "settings.cpp"
#include "subscribers.cpp"
#include "rates.cpp"
#include "orclize.cpp"
#include "defer.cpp"
#include "liquid.cpp"
#include "delphi.cpp"

namespace eosdt {
#ifdef DELETEDATA
    void eosdtorclize::deletedata() {
        queriesdeltt();
        ratesdeltt();
        settingerase();
    }
#endif
}/// namespace eosdt



EOSIO_DISPATCH_EX(eosdt::eosdtorclize, (currentver)
#ifdef MOCK
        (mockrateset)
#else
        (settingset)(setlistdate)
        (transfer)(unsubscribe)(ratechanged)
        (queryadd)(querydel)(callback)
        (refreshutil)(masterefresh)
        (startrefresh)(stoprefresh)
        (delphirefres)
#endif
#ifdef DELETEDATA
(settingerase)(ratesdeltt)(queriesdeltt)(deletedata)
#endif
#ifdef TESTNET
(xschedule)(xgeturi)(xorcclean)(xsignal)(orarecover)
#endif
)
