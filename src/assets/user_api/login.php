<?php
header("Access-Control-Allow-Origin: http://localhost:8100");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Database connection details
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "best";

// Create a connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Handle GET request for user details
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['user_id'])) {
        $user_id = mysqli_real_escape_string($conn, $_GET['user_id']);
        
        $sql = "SELECT user_id, username, first_name, last_name, email, role FROM users WHERE user_id = '$user_id'";
        $result = $conn->query($sql);

        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            // Remove sensitive data before sending
            unset($user['password_hash']);
            echo json_encode($user);
        } else {
            http_response_code(404);
            echo json_encode(['status' => 0, 'message' => 'User not found']);
        }
        exit();
    }
}

// Handle POST request for login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $postdata = file_get_contents("php://input");

    if (isset($postdata) && !empty($postdata)) {
        $request = json_decode($postdata);

        $email = mysqli_real_escape_string($conn, trim($request->email));
        $password = trim($request->password);

        $sql = "SELECT * FROM users WHERE email='$email'";
        $result = $conn->query($sql);

        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();

            if (password_verify($password, $row['password_hash'])) {
                $response = [
                    'status' => 1,
                    'message' => 'Login successful',
                    'user_id' => $row['user_id'],
                    'email' => $row['email'],
                    'username' => $row['username'],
                    'role' => $row['role']
                ];
            } else {
                $response = ['status' => 0, 'message' => 'Invalid password'];
            }
        } else {
            $response = ['status' => 0, 'message' => 'User not found'];
        }

        echo json_encode($response);
    }
}

$conn->close();
?>