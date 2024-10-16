<?php
// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

try {
    $servername = "localhost";
    $username = "root";
    $password = "";
    $dbname = "best";

    // Create connection with error handling
    $conn = new mysqli($servername, $username, $password, $dbname);

    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }

    $requestMethod = $_SERVER['REQUEST_METHOD'];

    switch($requestMethod) {
        case 'GET':
            // Get all promotions
            $sql = "SELECT p.*, pr.name as product_name 
                    FROM promotions p 
                    LEFT JOIN products pr ON p.product_id = pr.product_id";
            $result = $conn->query($sql);
            
            if (!$result) {
                throw new Exception("Error executing query: " . $conn->error);
            }
            
            $promotions = [];
            while($row = $result->fetch_assoc()) {
                $promotions[] = $row;
            }
            echo json_encode($promotions);
            break;

        case 'POST':
            $postdata = file_get_contents("php://input");
            if (!$postdata) {
                throw new Exception("No data received");
            }

            $request = json_decode($postdata);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Invalid JSON data received");
            }

            // Validate required fields
            if (!isset($request->product_id) || !isset($request->name) || 
                !isset($request->discount_percentage) || !isset($request->start_date) || 
                !isset($request->end_date)) {
                throw new Exception("Missing required fields");
            }

            $product_id = (int)$request->product_id;
            $name = mysqli_real_escape_string($conn, trim($request->name));
            $description = isset($request->description) ? 
                          mysqli_real_escape_string($conn, trim($request->description)) : '';
            $discount_percentage = (float)$request->discount_percentage;
            $start_date = mysqli_real_escape_string($conn, $request->start_date);
            $end_date = mysqli_real_escape_string($conn, $request->end_date);

            $sql = "INSERT INTO promotions (product_id, name, description, discount_percentage, start_date, end_date) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }

            $stmt->bind_param("issdss", $product_id, $name, $description, $discount_percentage, $start_date, $end_date);
            
            if (!$stmt->execute()) {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            echo json_encode([
                'status' => 'success',
                'message' => 'Promotion added successfully',
                'id' => $conn->insert_id
            ]);
            
            $stmt->close();
            break;

        case 'PUT':
            if (!isset($_GET['id'])) {
                throw new Exception("No promotion ID provided");
            }

            $postdata = file_get_contents("php://input");
            if (!$postdata) {
                throw new Exception("No data received");
            }

            $request = json_decode($postdata);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Invalid JSON data received");
            }

            $id = (int)$_GET['id'];
            $product_id = (int)$request->product_id;
            $name = mysqli_real_escape_string($conn, trim($request->name));
            $description = isset($request->description) ? 
                          mysqli_real_escape_string($conn, trim($request->description)) : '';
            $discount_percentage = (float)$request->discount_percentage;
            $start_date = mysqli_real_escape_string($conn, $request->start_date);
            $end_date = mysqli_real_escape_string($conn, $request->end_date);

            $sql = "UPDATE promotions SET 
                    product_id = ?, 
                    name = ?, 
                    description = ?, 
                    discount_percentage = ?, 
                    start_date = ?, 
                    end_date = ? 
                    WHERE promotion_id = ?";
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }

            $stmt->bind_param("issdssi", $product_id, $name, $description, $discount_percentage, $start_date, $end_date, $id);
            
            if (!$stmt->execute()) {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            echo json_encode([
                'status' => 'success',
                'message' => 'Promotion updated successfully'
            ]);
            
            $stmt->close();
            break;

        case 'DELETE':
            if (!isset($_GET['id'])) {
                throw new Exception("No promotion ID provided");
            }

            $id = (int)$_GET['id'];
            $sql = "DELETE FROM promotions WHERE promotion_id = ?";
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }

            $stmt->bind_param("i", $id);
            
            if (!$stmt->execute()) {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            echo json_encode([
                'status' => 'success',
                'message' => 'Promotion deleted successfully'
            ]);
            
            $stmt->close();
            break;

        default:
            throw new Exception("Unsupported request method");
    }

} catch (Exception $e) {
    // Return error as JSON
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>