while (Get-WmiObject Win32_Process -Filter "CommandLine LIKE '%execute_c1_tests_rest.js%'") {
    Start-Sleep -Seconds 10
}
python update_c1_xlsx.py
