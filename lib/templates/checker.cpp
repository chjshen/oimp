#include <algorithm>
#include <cctype>
#include <string>

#include "testlib.h"

using namespace std;

// 移除字符串右侧的空白字符
string rtrim(const string& s)
{
    size_t end = s.find_last_not_of(" \t\r\n");
    return (end == string::npos) ? "" : s.substr(0, end + 1);
}

int main(int argc, char* argv[])
{
    registerTestlibCmd(argc, argv);

    int lineNum = 0;
    bool allMatch = true;

    while (!ans.eof() || !ouf.eof())
    {
        lineNum++;
        string j = ans.readLine();
        string p = ouf.readLine();

        // 移除行末空格
        j = rtrim(j);
        p = rtrim(p);

        // 跳过空行
        if (j.empty() && p.empty()) continue;

        // 检查是否同时到达文件末尾
        if (ans.eof() && !ouf.eof())
        {
            quitf(_wa, "Extra output in line %d: '%s'", lineNum, p.c_str());
        }
        if (!ans.eof() && ouf.eof())
        {
            quitf(_wa, "Missing output at line %d", lineNum);
        }

        // 比较非空行
        if (j != p)
        {
            quitf(_wa, "Difference at line %d\nExpected: '%s'\nFound:    '%s'",
                  lineNum, j.c_str(), p.c_str());
        }
    }

    quitf(_ok, "All lines match (ignoring trailing spaces and empty lines)");
}
