<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Set content type for all responses
header("Content-Type: application/json; charset=UTF-8");

// Function to send JSON response
function sendJsonResponse($status, $message, $data = null) {
    http_response_code($status);
    $response = ['status' => $status, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response);
    exit();
}

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "best";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    logMessage("Database connection failed: " . $conn->connect_error);
    sendJsonResponse(500, "Database connection failed");
}

// Handle POST request to add a new address
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['user_id'], $data['address_line1'], $data['city'], $data['country'])) {
        sendJsonResponse(400, "Missing required fields");
    }

    $user_id = $conn->real_escape_string($data['user_id']);
    $address_line1 = $conn->real_escape_string($data['address_line1']);
    $address_line2 = $conn->real_escape_string($data['address_line2'] ?? '');
    $city = $conn->real_escape_string($data['city']);
    $province = $conn->real_escape_string($data['province'] ?? '');
    $postal_code = $conn->real_escape_string($data['postal_code'] ?? '');
    $country = $conn->real_escape_string($data['country']);

    $sql = "INSERT INTO user_addresses (user_id, address_line1, address_line2, city, province, postal_code, country) 
            VALUES ('$user_id', '$address_line1', '$address_line2', '$city', '$province', '$postal_code', '$country')";

    if ($conn->query($sql) === TRUE) {
        sendJsonResponse(201, "Address added successfully", ['address_id' => $conn->insert_id]);
    } else {
        logMessage("Error adding address: " . $conn->error);
        sendJsonResponse(500, "Error adding address");
    }
}

// Handle GET request to retrieve addresses for a user
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['user_id'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing user_id parameter"]);
        exit();
    }

    $user_id = $conn->real_escape_string($_GET['user_id']);

    $sql = "SELECT * FROM user_addresses WHERE user_id = '$user_id'";
    $result = $conn->query($sql);

    if ($result) {
        $addresses = [];
        while ($row = $result->fetch_assoc()) {
            $addresses[] = $row;
        }
        echo json_encode($addresses);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Error retrieving addresses"]);
    }
}

// Handle DELETE request to remove an address
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['address_id'], $data['user_id'])) {
        sendJsonResponse(400, "Missing required fields");
    }

    $address_id = $conn->real_escape_string($data['address_id']);
    $user_id = $conn->real_escape_string($data['user_id']);

    $sql = "DELETE FROM user_addresses WHERE id = '$address_id' AND user_id = '$user_id'";

    if ($conn->query($sql) === TRUE) {
        if ($conn->affected_rows > 0) {
            sendJsonResponse(200, "Address deleted successfully");
        } else {
            sendJsonResponse(404, "Address not found or doesn't belong to the user");
        }
    } else {
        sendJsonResponse(500, "Error deleting address: " . $conn->error);
    }
}

$conn->close();

?>