find_package(eosio.cdt)

add_contract(eosio.token eosio.token ${CMAKE_CURRENT_SOURCE_DIR}/src/eosio.token.cpp)

target_include_directories(eosio.token.wasm
        PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include)

target_compile_options(eosio.token.wasm PUBLIC -R${CMAKE_CURRENT_SOURCE_DIR})

