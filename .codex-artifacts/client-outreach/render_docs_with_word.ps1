param(
    [Parameter(Mandatory = $true)]
    [string]$InputDirectory,
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$resolvedInput = (Resolve-Path -LiteralPath $InputDirectory).Path
if (-not (Test-Path -LiteralPath $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
}
$resolvedOutput = (Resolve-Path -LiteralPath $OutputDirectory).Path

$word = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    Get-ChildItem -LiteralPath $resolvedInput -Filter '*.docx' | ForEach-Object {
        $document = $null
        try {
            $document = $word.Documents.Open($_.FullName, $false, $true)
            $pdfPath = Join-Path $resolvedOutput ($_.BaseName + '.pdf')
            $document.ExportAsFixedFormat($pdfPath, 17)
            Write-Output $pdfPath
        }
        finally {
            if ($null -ne $document) {
                $document.Close(0)
                [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
            }
        }
    }
}
finally {
    if ($null -ne $word) {
        $word.Quit()
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

