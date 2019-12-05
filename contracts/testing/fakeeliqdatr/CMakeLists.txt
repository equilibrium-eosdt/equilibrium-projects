cmake_minimum_required(VERSION 3.5)
project(fakee_liqdatr_example VERSION 1.0.0)
find_package(eosio.cdt)

execute_process(COMMAND git rev-parse --abbrev-ref HEAD
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE GIT_BRANCH
        OUTPUT_STRIP_TRAILING_WHITESPACE
        )
execute_process(COMMAND git log -1 --format=%h
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE GIT_COMMIT
        OUTPUT_STRIP_TRAILING_WHITESPACE
        )
execute_process(COMMAND git log -1 --format=%cd --date=local
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE GIT_VERSION
        OUTPUT_STRIP_TRAILING_WHITESPACE
        )

function(get_file_size var filename)
    if(EXISTS "${filename}")
        file(READ "${filename}" content HEX)
        string(LENGTH "${content}" content_length)
        math(EXPR content_length "${content_length} / 2")
        set(${var} ${content_length} PARENT_SCOPE)
    else()
        set(${var} 0 PARENT_SCOPE)
    endif()
endfunction()

function(get_count_line_of_code var filenames)
    set(cloc 0)
    foreach(filename ${filenames})
        file(STRINGS "${filename}" strings)
        list(LENGTH strings count)
        math(EXPR cloc "${cloc}+${count}")
    endforeach(filename)
    set(${var} ${cloc} PARENT_SCOPE)
endfunction()

add_contract(fakeeliqdatr fakeeliqdatr fakeeliqdatr.cpp)


target_compile_options(fakeeliqdatr.wasm PUBLIC -R${CMAKE_CURRENT_SOURCE_DIR})

get_file_size(ABI_SIZE ${CMAKE_CURRENT_BINARY_DIR}/fakeeliqdatr.abi)
get_file_size(WASM_SIZE ${CMAKE_CURRENT_BINARY_DIR}/fakeeliqdatr.wasm)
file(GLOB_RECURSE SOURCE_FILES "*.hpp" "*.cpp")
get_count_line_of_code(CLOC "${SOURCE_FILES}")


configure_file(info.hpp.in ${CMAKE_CURRENT_SOURCE_DIR}/info.hpp)






