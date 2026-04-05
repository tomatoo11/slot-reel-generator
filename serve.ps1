$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8000)
$listener.Start()

Write-Output "Serving $root at http://localhost:8000/"

$contentTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".svg"  = "image/svg+xml"
  ".json" = "application/json; charset=utf-8"
  ".txt"  = "text/plain; charset=utf-8"
}

function Send-Response($stream, [int]$statusCode, [string]$statusText, [byte[]]$body, [string]$contentType) {
  $writer = New-Object System.IO.StreamWriter($stream, [System.Text.Encoding]::ASCII, 1024, $true)
  $writer.NewLine = "`r`n"
  $writer.WriteLine("HTTP/1.1 $statusCode $statusText")
  $writer.WriteLine("Content-Type: $contentType")
  $writer.WriteLine("Content-Length: $($body.Length)")
  $writer.WriteLine("Connection: close")
  $writer.WriteLine()
  $writer.Flush()
  $stream.Write($body, 0, $body.Length)
  $stream.Flush()
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        continue
      }

      while (($line = $reader.ReadLine()) -ne "") {
        if ($null -eq $line) { break }
      }

      $parts = $requestLine.Split(" ")
      $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
      $requestPath = [System.Uri]::UnescapeDataString(($rawPath.Split("?")[0]).TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($requestPath)) {
        $requestPath = "index.html"
      }

      $safePath = $requestPath -replace "/", "\"
      $fullPath = Join-Path $root $safePath

      if ((Test-Path $fullPath) -and -not (Get-Item $fullPath).PSIsContainer) {
        $extension = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
        $contentType = $contentTypes[$extension]
        if (-not $contentType) {
          $contentType = "application/octet-stream"
        }
        $body = [System.IO.File]::ReadAllBytes($fullPath)
        Send-Response $stream 200 "OK" $body $contentType
      } else {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
        Send-Response $stream 404 "Not Found" $body "text/plain; charset=utf-8"
      }
    }
    finally {
      $client.Close()
    }
  }
}
finally {
  $listener.Stop()
}
