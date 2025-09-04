# PowerShell script to rename files in a specified folder by removing "Photoroom" from their filenames.

# Specify the folder path here. Replace 'C:\Path\To\Your\Folder' with your actual folder path.
$folderPath = 'F:\us custom caps\New folder'

# Get all files in the folder (assuming they are images, but this works for any files containing "Photoroom" in the name)
$files = Get-ChildItem -Path $folderPath | Where-Object { $_.Name -like '*Photoroom*' }

# Loop through each file and rename it by removing "Photoroom"
foreach ($file in $files) {
    # Create the new filename by replacing "Photoroom" with an empty string
    $newName = $file.Name -replace '-', ''
	
    # Check if the new name is different to avoid unnecessary operations
    if ($newName -ne $file.Name) {
        # Construct the full paths
        $oldFullPath = $file.FullName
        $newFullPath = Join-Path -Path $folderPath -ChildPath $newName
        
        # Rename the file (use -Force to overwrite if a conflict occurs, but be cautious)
        Rename-Item -Path $oldFullPath -NewName $newName -Force
        
        Write-Host "Renamed: $($file.Name) to $newName"
    } else {
        Write-Host "No change needed for: $($file.Name)"
    }
}

Write-Host "Renaming process completed."