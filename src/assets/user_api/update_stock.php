<?php
header("Access-Control-Allow-Origin: http://localhost:8100");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

function logMessage($message) {
    file_put_contents('debug.log', date('[Y-m-d H:i:s] ') . $message . PHP_EOL, FILE_APPEND);
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "best";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    logMessage("Connection failed: " . $conn->connect_error);
    sendJsonResponse(["error" => "Database connection failed"], 500);
}

// Get the raw POST data
$rawData = file_get_contents("php://input");
$data = json_decode($rawData);

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    if (!empty($data->product_id) && isset($data->quantity)) {
        $product_id = $conn->real_escape_string($data->product_id);
        $quantity = $conn->real_escape_string($data->quantity);

        $query = "UPDATE products SET stock_quantity = ? WHERE product_id = ?";
        
        $stmt = $conn->prepare($query);
        if ($stmt === false) {
            logMessage("Prepare failed: " . $conn->error);
            sendJsonResponse(["error" => "Prepare failed"], 500);
        }

        $stmt->bind_param("ii", $quantity, $product_id);
        
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                sendJsonResponse(["message" => "Stock updated successfully"]);
            } else {
                sendJsonResponse(["message" => "No changes made. Product might not exist."], 404);
            }
        } else {
            logMessage("Execute failed: " . $stmt->error);
            sendJsonResponse(["error" => "Unable to update stock"], 500);
        }

        $stmt->close();
    } else {
        sendJsonResponse(["error" => "Invalid data provided"], 400);
    }
} else {
    sendJsonResponse(["error" => "Invalid request method"], 405);
}

$conn->close();
?>