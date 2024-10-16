<?php
// CORS headers
header("Access-Control-Allow-Origin: http://localhost:8100");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
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
    die("Connection failed: " . $conn->connect_error);
}

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Get the posted data
$postdata = file_get_contents("php://input");

if ($method === 'POST' && isset($postdata) && !empty($postdata)) {
    // Register new user
    $request = json_decode($postdata);
    $username = mysqli_real_escape_string($conn, trim($request->username));
    $first_name = mysqli_real_escape_string($conn, trim($request->first_name));
    $last_name = mysqli_real_escape_string($conn, trim($request->last_name));
    $email = mysqli_real_escape_string($conn, trim($request->email));
    $password_hash = password_hash(trim($request->password), PASSWORD_DEFAULT);
    $role = mysqli_real_escape_string($conn, trim($request->role));

    if (empty($role)) {
        $role = 'customer'; // Default role if not specified
    }

    $sql = "INSERT INTO users (username, first_name, last_name, email, password_hash, role) 
            VALUES ('$username', '$first_name', '$last_name', '$email', '$password_hash', '$role')";

    if ($conn->query($sql) === TRUE) {
        $response = ['status' => 1, 'message' => 'User registered successfully.'];
    } else {
        $response = ['status' => 0, 'message' => 'Error: ' . $conn->error];
    }

    echo json_encode($response);
}

if ($method === 'PUT' && isset($postdata) && !empty($postdata)) {
    // Update user details
    $request = json_decode($postdata);
    $user_id = mysqli_real_escape_string($conn, trim($_GET['user_id']));
    $username = mysqli_real_escape_string($conn, trim($request->username));
    $first_name = mysqli_real_escape_string($conn, trim($request->first_name));
    $last_name = mysqli_real_escape_string($conn, trim($request->last_name));
    $email = mysqli_real_escape_string($conn, trim($request->email));
    $role = mysqli_real_escape_string($conn, trim($request->role));

    $sql = "UPDATE users 
            SET username='$username', first_name='$first_name', last_name='$last_name', email='$email', role='$role' 
            WHERE user_id='$user_id'";

    if ($conn->query($sql) === TRUE) {
        $response = ['status' => 1, 'message' => 'User updated successfully.'];
    } else {
        $response = ['status' => 0, 'message' => 'Error: ' . $conn->error];
    }

    echo json_encode($response);
}

if ($method === 'DELETE') {
    // Delete user
    $user_id = mysqli_real_escape_string($conn, trim($_GET['user_id']));
    $sql = "DELETE FROM users WHERE user_id='$user_id'";

    if ($conn->query($sql) === TRUE) {
        $response = ['status' => 1, 'message' => 'User deleted successfully.'];
    } else {
        $response = ['status' => 0, 'message' => 'Error: ' . $conn->error];
    }

    echo json_encode($response);
}

if ($method === 'GET') {
    if (isset($_GET['count']) && $_GET['count'] === 'true') {
        // Handle counting users
        countUsers($conn);
    } elseif (isset($_GET['role']) && $_GET['role'] !== 'admin' && $_GET['role'] !== 'cashier') {
        fetchNormalUsers($conn, $_GET['role']);
    } elseif (isset($_GET['role']) && ($_GET['role'] === 'admin' || $_GET['role'] === 'cashier')) {
        fetchAdminOrCashierUsers($conn);
    } else {
        echo json_encode(['status' => 0, 'message' => 'Role parameter is required']);
    }
}

// Function to count all users
function countUsers($conn) {
    $sql = "SELECT COUNT(*) AS user_count FROM users";
    $result = $conn->query($sql);

    $data = [];
    if ($result->num_rows > 0) {
        $data = $result->fetch_assoc();
    }

    echo json_encode($data);
}

// Function to fetch normal users
function fetchNormalUsers($conn, $role) {
    $role = mysqli_real_escape_string($conn, trim($role));
    $sql = "SELECT * FROM users WHERE role='$role'";
    $result = $conn->query($sql);

    $users = [];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
    }

    echo json_encode($users);
}

// Function to fetch users with role 'admin' or 'cashier'
function fetchAdminOrCashierUsers($conn) {
    $sql = "SELECT * FROM users WHERE role='admin' OR role='cashier'";
    $result = $conn->query($sql);

    $users = [];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
    }

    echo json_encode($users);
}

$conn->close();
?>
