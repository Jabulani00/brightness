<?php
$fileUrls = isset($_GET['urls']) ? $_GET['urls'] : [];
header('Access-Control-Allow-Origin: *');
foreach ($fileUrls as $fileUrl) {
    $fileName = basename($fileUrl);


    // Initialize cURL
    $curl = curl_init($fileUrl);


    // Set options
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);


    // Perform the request
    $fileContent = curl_exec($curl);


    // Check if the request was successful
    if ($fileContent === false) {
        echo 'Error downloading the file: ' . $fileUrl;
    } else {
        // Set the appropriate headers for download
       
        header("Content-Disposition: attachment; filename=\"$fileName\"");
        header("Content-Type: application/pdf");
        header("Content-Length: " . strlen($fileContent));


        // Output the file content
        echo $fileContent;
    }


    // Close the cURL session
    curl_close($curl);
}
?>


       



