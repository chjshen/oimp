#include <bits/stdc++.h>

#include "testlib.h"

using namespace std;

int main(int argc, char* argv[])
{
    registerValidation(argc, argv);

    // 读取输入
    int n = inf.readInt(1, 100000, "n");
    inf.readEoln();

    for (int i = 0; i < n; i++)
    {
        inf.readInt(1, 1000000000, format("a[%d]", i));
        if (i < n - 1) inf.readSpace();
    }
    inf.readEoln();

    inf.readEof();

    return 0;
}
