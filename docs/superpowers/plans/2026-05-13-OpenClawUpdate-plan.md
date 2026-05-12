# OpenClawUpdate 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 创建 WPF 桌面应用，更新 OpenClawPro 便携版，支持目录选择，按钮预留后期实现

**架构：** WPF 单窗口应用，MVVM 模式，CommunityToolkit.Mvvm 实现数据绑定

**技术栈：** .NET 8.0 Windows Desktop, CommunityToolkit.Mvvm

---

## 文件结构

```
OpenClawUpdate/
├── OpenClawUpdate.sln
├── OpenClawUpdate/
│   ├── OpenClawUpdate.csproj
│   ├── App.xaml
│   ├── App.xaml.cs
│   ├── MainWindow.xaml
│   ├── MainWindow.xaml.cs
│   ├── ViewModels/
│   │   └── MainViewModel.cs
│   └── Utils/
│       └── PathHelper.cs
└── docs/
    └── specs/
        └── 2026-05-13-OpenClawUpdate-design.md
```

---

## 任务列表

### 任务 1: 创建项目框架

**文件：**
- 创建: `OpenClawUpdate/OpenClawUpdate.sln`
- 创建: `OpenClawUpdate/OpenClawUpdate/OpenClawUpdate.csproj`

- [ ] **Step 1: 创建解决方案**

```bash
cd c:/Users/jiabao/Desktop/claw/usb-claw-project
mkdir -p OpenClawUpdate
cd OpenClawUpdate
dotnet new sln -n OpenClawUpdate
```

- [ ] **Step 2: 创建 WPF 项目**

```bash
cd OpenClawUpdate
dotnet new wpf -n OpenClawUpdate -o OpenClawUpdate --framework net8.0-windows
dotnet sln add OpenClawUpdate/OpenClawUpdate.csproj
```

- [ ] **Step 3: 添加 CommunityToolkit.Mvvm 依赖**

```bash
cd OpenClawUpdate/OpenClawUpdate
dotnet add package CommunityToolkit.Mvvm --version 8.2.2
```

- [ ] **Step 4: 提交**

```bash
git add OpenClawUpdate/
git commit -m "feat: 创建 OpenClawUpdate WPF 项目框架"
```

---

### 任务 2: 创建 ViewModel

**文件：**
- 创建: `OpenClawUpdate/OpenClawUpdate/ViewModels/MainViewModel.cs`
- 创建: `OpenClawUpdate/OpenClawUpdate/Utils/PathHelper.cs`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p OpenClawUpdate/OpenClawUpdate/ViewModels
mkdir -p OpenClawUpdate/OpenClawUpdate/Utils
```

- [ ] **Step 2: 创建 PathHelper.cs**

```csharp
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
```

- [ ] **Step 3: 创建 MainViewModel.cs**

```csharp
using System;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Win32;

namespace OpenClawUpdate.ViewModels;

public partial class MainViewModel : ObservableObject
{
    [ObservableProperty]
    private string _targetPath = string.Empty;

    [ObservableProperty]
    private string _statusMessage = string.Empty;

    public MainViewModel()
    {
        TargetPath = Utils.PathHelper.GetApplicationDirectory();
        StatusMessage = "就绪";
    }

    [RelayCommand]
    private void Browse()
    {
        var dialog = new OpenFolderDialog
        {
            Title = "选择更新目录",
            InitialDirectory = TargetPath
        };

        if (dialog.ShowDialog() == true)
        {
            TargetPath = dialog.FolderName;
            StatusMessage = "目录已选择";
        }
    }

    [RelayCommand]
    private void FullReinstall()
    {
        StatusMessage = "完全重装功能待实现";
        MessageBox.Show("完全重装功能待后期实现", "提示", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    [RelayCommand]
    private void QuickUpdate()
    {
        StatusMessage = "一键更新功能待实现";
        MessageBox.Show("一键更新功能待后期实现", "提示", MessageBoxButton.OK, MessageBoxImage.Information);
    }
}
```

- [ ] **Step 4: 提交**

```bash
git add OpenClawUpdate/OpenClawUpdate/ViewModels/
git add OpenClawUpdate/OpenClawUpdate/Utils/
git commit -m "feat: 添加 ViewModel 和 PathHelper"
```

---

### 任务 3: 实现主窗口 UI

**文件：**
- 修改: `OpenClawUpdate/OpenClawUpdate/MainWindow.xaml`
- 修改: `OpenClawUpdate/OpenClawUpdate/MainWindow.xaml.cs`
- 修改: `OpenClawUpdate/OpenClawUpdate/App.xaml`

- [ ] **Step 1: 修改 App.xaml 添加全局样式**

```xml
<Application x:Class="OpenClawUpdate.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             StartupUri="MainWindow.xaml">
    <Application.Resources>
        <Style TargetType="Button">
            <Setter Property="Background" Value="#189AF4"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="FontFamily" Value="Segoe UI"/>
            <Setter Property="Padding" Value="20,8"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}"
                                CornerRadius="3"
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
            <Style.Triggers>
                <Trigger Property="IsMouseOver" Value="True">
                    <Setter Property="Background" Value="#0D5EAF"/>
                </Trigger>
            </Style.Triggers>
        </Style>
    </Application.Resources>
</Application>
```

- [ ] **Step 2: 修改 MainWindow.xaml**

```xml
<Window x:Class="OpenClawUpdate.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:vm="clr-namespace:OpenClawUpdate.ViewModels"
        Title="OpenClaw 更新工具"
        Width="450"
        Height="280"
        ResizeMode="NoResize"
        WindowStartupLocation="CenterScreen">

    <Window.DataContext>
        <vm:MainViewModel/>
    </Window.DataContext>

    <Grid Background="#F5F5F5">
        <StackPanel Margin="30">
            <!-- 目录选择区域 -->
            <TextBlock Text="当前目录："
                       FontSize="13"
                       FontFamily="Segoe UI"
                       Margin="0,0,0,8"/>

            <Grid Margin="0,0,0,30">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>

                <TextBox Grid.Column="0"
                         Text="{Binding TargetPath, Mode=OneWay}"
                         IsReadOnly="True"
                         FontFamily="Segoe UI"
                         FontSize="12"
                         Padding="8,6"
                         VerticalContentAlignment="Center"
                         Margin="0,0,10,0"/>

                <Button Grid.Column="1"
                        Content="浏览"
                        Command="{Binding BrowseCommand}"
                        Width="70"/>
            </Grid>

            <!-- 按钮区域 -->
            <StackPanel Orientation="Horizontal"
                        HorizontalAlignment="Center"
                        Margin="0,20,0,0">
                <Button Content="完全重装"
                        Command="{Binding FullReinstallCommand}"
                        Width="120"
                        Height="36"
                        Margin="0,0,20,0"/>
                <Button Content="一键更新"
                        Command="{Binding QuickUpdateCommand}"
                        Width="120"
                        Height="36"/>
            </StackPanel>
        </StackPanel>
    </Grid>
</Window>
```

- [ ] **Step 3: 修改 MainWindow.xaml.cs**

```csharp
using System.Windows;

namespace OpenClawUpdate;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
}
```

- [ ] **Step 4: 提交**

```bash
git add OpenClawUpdate/OpenClawUpdate/MainWindow.xaml
git add OpenClawUpdate/OpenClawUpdate/MainWindow.xaml.cs
git add OpenClawUpdate/OpenClawUpdate/App.xaml
git commit -m "feat: 实现主窗口 UI"
```

---

### 任务 4: 编译验证

**文件：**
- 测试: `OpenClawUpdate/OpenClawUpdate/OpenClawUpdate.csproj`

- [ ] **Step 1: 编译项目**

```bash
cd OpenClawUpdate/OpenClawUpdate
dotnet build
```

- [ ] **Step 2: 验证编译成功**

编译无错误，输出 `Build succeeded.`

- [ ] **Step 3: 运行测试（可选）**

```bash
cd OpenClawUpdate/OpenClawUpdate
dotnet run --windowstyle hidden
```

窗口应正常打开，450×280 大小，显示目录路径和两个按钮。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: 完成 OpenClawUpdate 基础功能"
```

---

## 验收清单

- [ ] 窗口打开后显示小弹窗（450×280）
- [ ] 路径文本框显示 exe 所在目录
- [ ] 点击"浏览"可更换目录
- [ ] "完全重装"和"一键更新"按钮可见
- [ ] 编译无错误
