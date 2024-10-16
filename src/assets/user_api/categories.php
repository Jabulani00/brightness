<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "best";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(array("success" => false, "message" => "Connection failed: " . $conn->connect_error)));
}

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        $sql = "SELECT * FROM categories";
        $result = $conn->query($sql);
        $categories = [];
        while($row = $result->fetch_assoc()) {
            $categories[] = $row;
        }
        echo json_encode($categories);
        break;
    case 'POST':
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->name) || empty(trim($data->name))) {
            echo json_encode(["success" => false, "message" => "Category name is required"]);
            break;
        }
        $name = $conn->real_escape_string($data->name);
        $sql = "INSERT INTO categories (name) VALUES ('$name')";
        if($conn->query($sql)) {
            $new_id = $conn->insert_id;
            echo json_encode(["success" => true, "message" => "Category added successfully", "category_id" => $new_id]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $conn->error]);
        }
        break;
    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));
        $category_id = $conn->real_escape_string($data->category_id);
        $name = $conn->real_escape_string($data->name);
        $sql = "UPDATE categories SET name='$name' WHERE category_id=$category_id";
        if($conn->query($sql)) {
            echo json_encode(["success" => true, "message" => "Category updated successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $conn->error]);
        }
        break;
    case 'DELETE':
        $category_id = $conn->real_escape_string($_GET['category_id']);
        $sql = "DELETE FROM categories WHERE category_id=$category_id";
        if($conn->query($sql)) {
            echo json_encode(["success" => true, "message" => "Category deleted successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $conn->error]);
        }
        break;
    default:
        echo json_encode(["success" => false, "message" => "Invalid request method"]);
        break;
}

$conn->close();
?>