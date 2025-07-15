#include <cstdio>
#include <cstdlib>
#include <ctime>
#include <iostream>

#include "testlib.h"
using namespace std;
const int N = 1E3;
int t;

int main(int argn, char* argv[])
{
    if (argn > 1) t = atoi(argv[1]);
    registerGen(argn, argv, 1);

    return 0;
}
