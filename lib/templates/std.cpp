#include <bits/stdc++.h>

using namespace std;

int main()
{
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    vector<int> a(n);
    for (int i = 0; i < n; i++)
    {
        cin >> a[i];
    }

    // 示例：计算总和
    long long sum = accumulate(a.begin(), a.end(), 0LL);
    cout << sum << endl;

    return 0;
}
