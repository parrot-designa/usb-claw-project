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