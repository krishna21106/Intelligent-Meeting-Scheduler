$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = 'C:\Users\hasen\OneDrive\Desktop\Network management system'
$source = Join-Path $root '_abstract_workflow_source.txt'
$path = Join-Path $root 'CNIP_Network_Manager_Abstract_and_Workflow.docx'
$body = ''
foreach ($line in Get-Content -LiteralPath $source) {
    $kind = $line.Substring(0, 1)
    $text = [System.Security.SecurityElement]::Escape($line.Substring(2))
    $style = 'Normal'
    if ($kind -eq 'T') { $style = 'Title' }
    elseif ($kind -eq 'S') { $style = 'Subtitle' }
    elseif ($kind -eq 'H') { $style = 'Heading1' }
    elseif ($kind -eq 'B') { $text = '-  ' + $text }
    $body += '<w:p><w:pPr><w:pStyle w:val="' + $style + '"/></w:pPr><w:r><w:t xml:space="preserve">' + $text + '</w:t></w:r></w:p>'
}
$document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + $body + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900"/></w:sectPr></w:body></w:document>'
$styles = '<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="280"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:color w:val="17365D"/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="2878A8"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="17365D"/><w:sz w:val="27"/></w:rPr></w:style></w:styles>'
if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
$file = [System.IO.File]::Open($path, [System.IO.FileMode]::CreateNew)
$zip = [System.IO.Compression.ZipArchive]::new($file, [System.IO.Compression.ZipArchiveMode]::Create, $false)
function AddPart($archive, [string]$name, [string]$text) {
    $entry = $archive.CreateEntry($name)
    $stream = $entry.Open()
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($text)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Dispose()
}
AddPart $zip '[Content_Types].xml' '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'
AddPart $zip '_rels/.rels' '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
AddPart $zip 'word/_rels/document.xml.rels' '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
AddPart $zip 'word/document.xml' $document
AddPart $zip 'word/styles.xml' $styles
$zip.Dispose()
$file.Dispose()
$check = [System.IO.Compression.ZipFile]::OpenRead($path)
$entry = $check.GetEntry('word/document.xml')
$reader = [System.IO.StreamReader]::new($entry.Open())
$xml = $reader.ReadToEnd()
$reader.Dispose()
$check.Dispose()
[xml]$parsed = $xml
Write-Output "Verified $path"
Write-Output "Size: $((Get-Item -LiteralPath $path).Length) bytes; content paragraphs: $((Get-Content -LiteralPath $source).Count)"
