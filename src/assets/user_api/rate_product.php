<?php
// CORS headers
header("Access-Control-Allow-Origin: http://localhost:8100");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
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

// Handle POST request for rating a product
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $postdata = file_get_contents("php://input");

    // Check if the input is available
    if (isset($postdata) && !empty($postdata)) {
        // Decode JSON data
        $request = json_decode($postdata, true); // Added true to return associative array

        // Debugging: check if the data is correctly received
        error_log("Received data: " . print_r($request, true));

        // Check if product_id, user_id, and rating are set
        if (isset($request['product_id']) && isset($request['user_id']) && isset($request['rating'])) {
            $product_id = (int)$request['product_id'];
            $user_id = (int)$request['user_id'];
            $rating = (int)$request['rating'];

            // Debugging: check received data
            error_log("Product ID: $product_id, User ID: $user_id, Rating: $rating");

            // Get current rating data
            $query = "SELECT rating, ratingCount FROM products WHERE product_id = $product_id";
            $result = $conn->query($query);
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();
                $currentRating = (float)$row['rating'];
                $ratingCount = (int)$row['ratingCount'];

                // Calculate new average rating
                $newRatingCount = $ratingCount + 1;
                $newAverageRating = (($currentRating * $ratingCount) + $rating) / $newRatingCount;

                // Debugging: check new rating and rating count
                error_log("New Average Rating: $newAverageRating, New Rating Count: $newRatingCount");

                // Update product rating and ratingCount
                $updateQuery = "UPDATE products SET rating = $newAverageRating, ratingCount = $newRatingCount WHERE product_id = $product_id";
                if ($conn->query($updateQuery) === TRUE) {
                    // Insert user rating into user_rating table
                    $insertQuery = "INSERT INTO user_rating (user_id, product_id, rating) VALUES ($user_id, $product_id, $rating)";
                    if ($conn->query($insertQuery) === TRUE) {
                        $response = ['status' => 1, 'message' => 'Product rated successfully.'];
                    } else {
                        $response = ['status' => 0, 'message' => 'Error inserting user rating: ' . $conn->error];
                    }
                } else {
                    $response = ['status' => 0, 'message' => 'Error updating product rating: ' . $conn->error];
                }
            } else {
                $response = ['status' => 0, 'message' => 'Product not found.'];
            }
        } else {
            // Debugging: missing fields
            error_log("Missing required fields: product_id, user_id, and rating.");
            $response = ['status' => 0, 'message' => 'product_id, user_id, and rating are required.'];
        }

        // Output the response as JSON
        echo json_encode($response);
    } else {
        echo json_encode(['status' => 0, 'message' => 'No input data provided.']);
    }
}

$conn->close();
?>
