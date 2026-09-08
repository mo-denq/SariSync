param(
    [Parameter(Mandatory = $true)]
    [string]$WorkbookPath
)

$resolvedWorkbook = (Resolve-Path -LiteralPath $WorkbookPath).Path
$excel = $null
$workbook = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($resolvedWorkbook, 0, $true)
    $sheet = $workbook.Worksheets.Item(1)
    $formulaAddresses = @()
    try {
        $formulaCells = $sheet.UsedRange.SpecialCells(-4123)
        foreach ($cell in $formulaCells.Cells) {
            $formulaAddresses += $cell.Address($false, $false)
            [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($cell)
        }
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($formulaCells)
    }
    catch {
        $formulaAddresses = @()
    }

    $validationTypes = @{}
    foreach ($address in @("K10", "L10", "P10")) {
        $cell = $sheet.Range($address)
        try {
            $validationTypes[$address] = $cell.Validation.Type
        }
        catch {
            $validationTypes[$address] = 0
        }
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($cell)
    }

    $window = $workbook.Windows.Item(1)
    $result = [ordered]@{
        WorkbookOpened = $true
        WorksheetName = $sheet.Name
        FormulaAddresses = $formulaAddresses
        FormulaCount = $formulaAddresses.Count
        ValidationTypes = $validationTypes
        TableCount = $sheet.ListObjects.Count
        FreezePanes = $window.FreezePanes
        SplitRow = $window.SplitRow
        SplitColumn = $window.SplitColumn
        FollowUpDueNumberFormat = $sheet.Range("P6").NumberFormat
        LastUpdatedNumberFormat = $sheet.Range("H6").NumberFormat
    }
    $result | ConvertTo-Json -Depth 5

    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($window)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
}
finally {
    if ($null -ne $workbook) {
        $workbook.Close($false)
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
    }
    if ($null -ne $excel) {
        $excel.Quit()
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
