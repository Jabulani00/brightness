<?php
header("Access-Control-Allow-Origin: http://localhost:8100");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "best";

// Connect to the database
$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if (isset($_GET['user_id']) && isset($_GET['product_id'])) {
    $user_id = (int)$_GET['user_id'];
    $product_id = (int)$_GET['product_id'];

    $sql = "SELECT rating FROM user_rating WHERE user_id='$user_id' AND product_id='$product_id'";
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        echo json_encode(['rating' => (int)$row['rating']]);
    } else {
        echo json_encode(['rating' => 0]); // No rating found
    }
}

$conn->close();
?>
