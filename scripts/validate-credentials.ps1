 param (
    [string] $userName,
    [string] $password
 )

$entry = New-Object DirectoryServices.DirectoryEntry "", $userName, $password

if ($entry.PSBase.Name -eq $null) {
   exit 1
}

exit 0
