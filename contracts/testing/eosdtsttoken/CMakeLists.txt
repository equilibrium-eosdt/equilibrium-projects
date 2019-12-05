cmake_minimum_required(VERSION 3.5)
project(eosio_token_example VERSION 1.0.0)
find_package(eosio.cdt)

include(../eosdt/CMakeFunc.txt)
git_init(GIT_BRANCH  GIT_COMMIT GIT_VERSION)


add_contract(eosdtsttoken  eosdtsttoken eosdtsttoken.cpp)


target_compile_options(eosdtsttoken.wasm PUBLIC -R${CMAKE_CURRENT_SOURCE_DIR})

get_file_size(ABI_SIZE ${CMAKE_CURRENT_SOURCE_DIR}/eosdtsttoken.abi)
get_file_size(WASM_SIZE ${CMAKE_CURRENT_BINARY_DIR}/eosdtsttoken.wasm)
file(GLOB_RECURSE SOURCE_FILES "*.hpp" "*.cpp")
get_count_line_of_code(CLOC "${SOURCE_FILES}")


configure_file(info.hpp.in ${CMAKE_CURRENT_SOURCE_DIR}/info.hpp)





