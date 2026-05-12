using System;
using System.IO;

namespace OpenClawUpdate.Utils;

public static class PathHelper
{
    public static string GetApplicationDirectory()
    {
        string exePath = AppDomain.CurrentDomain.BaseDirectory;
        return Path.GetDirectoryName(exePath) ?? exePath;
    }
}