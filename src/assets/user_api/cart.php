<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Log function
function logMessage($message) {
    error_log(date('[Y-m-d H:i:s] ') . $message . PHP_EOL, 3, 'cart_api_debug.log');
}

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Function to send JSON response
function sendJsonResponse($status, $message, $data = null) {
    http_response_code($status);
    echo json_encode([
        'status' => $status,
        'message' => $message,
        'data' => $data
    ]);
    logMessage("Response sent: Status $status, Message: $message");
    exit();
}

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "best";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    logMessage("Database connection established");
} catch (PDOException $exception) {
    logMessage("Database connection error: " . $exception->getMessage());
    sendJsonResponse(500, "Database connection error: " . $exception->getMessage());
}

// Log the incoming request
logMessage("Received " . $_SERVER['REQUEST_METHOD'] . " request");

// Handle GET request to fetch cart items
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $user_id = isset($_GET['user_id']) ? filter_var($_GET['user_id'], FILTER_SANITIZE_NUMBER_INT) : null;
    logMessage("GET request received for user_id: " . $user_id);

    if ($user_id) {
        try {
            $query = "SELECT c.cart_id, c.user_id, c.product_id, c.quantity, 
                             p.name, p.price, p.image_url
                      FROM CART c
                      JOIN PRODUCTS p ON c.product_id = p.product_id
                      WHERE c.user_id = :user_id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();

            $cart_items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            logMessage("Cart items fetched successfully for user_id: " . $user_id);
            sendJsonResponse(200, "Cart items fetched successfully", $cart_items);
        } catch (PDOException $exception) {
            logMessage("Database error in GET request: " . $exception->getMessage());
            sendJsonResponse(500, "Database error: " . $exception->getMessage());
        }
    } else {
        logMessage("GET request failed: User ID is missing");
        sendJsonResponse(400, "User ID is required");
    }
}

// Handle POST request to add items to cart
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    logMessage("POST request received with data: " . json_encode($data));

    if (!empty($data->user_id) && !empty($data->product_id) && isset($data->quantity)) {
        $user_id = filter_var($data->user_id, FILTER_SANITIZE_NUMBER_INT);
        $product_id = filter_var($data->product_id, FILTER_SANITIZE_NUMBER_INT);
        $quantity = filter_var($data->quantity, FILTER_SANITIZE_NUMBER_INT);

        try {
            // Check if the product already exists in the cart
            $check_query = "SELECT * FROM CART WHERE user_id = :user_id AND product_id = :product_id";
            $check_stmt = $conn->prepare($check_query);
            $check_stmt->bindParam(":user_id", $user_id);
            $check_stmt->bindParam(":product_id", $product_id);
            $check_stmt->execute();

            if ($check_stmt->rowCount() > 0) {
                // Update existing cart item
                $update_query = "UPDATE CART SET quantity = quantity + :quantity WHERE user_id = :user_id AND product_id = :product_id";
                $stmt = $conn->prepare($update_query);
                logMessage("Updating existing cart item");
            } else {
                // Insert new cart item
                $insert_query = "INSERT INTO CART (user_id, product_id, quantity) VALUES (:user_id, :product_id, :quantity)";
                $stmt = $conn->prepare($insert_query);
                logMessage("Inserting new cart item");
            }

            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindParam(":product_id", $product_id);
            $stmt->bindParam(":quantity", $quantity);

            if ($stmt->execute()) {
                logMessage("Product added/updated in cart successfully");
                sendJsonResponse(201, "Product added to cart.");
            } else {
                logMessage("Failed to add/update product in cart");
                sendJsonResponse(503, "Unable to add product to cart.");
            }
        } catch (PDOException $exception) {
            logMessage("Database error in POST request: " . $exception->getMessage());
            sendJsonResponse(500, "Database error: " . $exception->getMessage());
        }
    } else {
        logMessage("POST request failed: Incomplete data");
        sendJsonResponse(400, "Incomplete data. Required fields: user_id, product_id, quantity");
    }
}

// Handle DELETE request to remove items from cart
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $user_id = isset($_GET['user_id']) ? filter_var($_GET['user_id'], FILTER_SANITIZE_NUMBER_INT) : null;
    $clear_all = isset($_GET['clear_all']) ? filter_var($_GET['clear_all'], FILTER_SANITIZE_STRING) : 'false';
    
    logMessage("DELETE request received for user_id: $user_id, clear_all: $clear_all");

    if (!$user_id) {
        logMessage("DELETE request failed: Missing user_id");
        sendJsonResponse(400, "User ID is required.");
    }

    try {
        if ($clear_all === 'true') {
            // Clear all items for the user
            $delete_query = "DELETE FROM CART WHERE user_id = :user_id";
            $stmt = $conn->prepare($delete_query);
            $stmt->bindParam(":user_id", $user_id);
            
            if ($stmt->execute()) {
                logMessage("All items removed from cart for user_id: $user_id");
                sendJsonResponse(200, "All items removed from cart.");
            } else {
                logMessage("Failed to remove all items from cart for user_id: $user_id");
                sendJsonResponse(503, "Unable to remove all items from cart.");
            }
        } else {
            // Remove a single item
            $product_id = isset($_GET['product_id']) ? filter_var($_GET['product_id'], FILTER_SANITIZE_NUMBER_INT) : null;
            
            if (!$product_id) {
                logMessage("DELETE request failed: Missing product_id for single item removal");
                sendJsonResponse(400, "Product ID is required for single item removal.");
            }

            $delete_query = "DELETE FROM CART WHERE user_id = :user_id AND product_id = :product_id";
            $stmt = $conn->prepare($delete_query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindParam(":product_id", $product_id);

            if ($stmt->execute()) {
                $affected_rows = $stmt->rowCount();
                if ($affected_rows > 0) {
                    logMessage("Product removed from cart successfully");
                    sendJsonResponse(200, "Product removed from cart.");
                } else {
                    logMessage("No product found to remove from cart");
                    sendJsonResponse(404, "No product found in cart to remove.");
                }
            } else {
                logMessage("Failed to remove product from cart");
                sendJsonResponse(503, "Unable to remove product from cart.");
            }
        }
    } catch (PDOException $exception) {
        logMessage("Database error in DELETE request: " . $exception->getMessage());
        sendJsonResponse(500, "Database error: " . $exception->getMessage());
    }
}

// Handle PUT request to update item quantity in cart
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"));
    logMessage("PUT request received with data: " . json_encode($data));

    if (!empty($data->user_id) && !empty($data->product_id) && isset($data->quantity)) {
        $user_id = filter_var($data->user_id, FILTER_SANITIZE_NUMBER_INT);
        $product_id = filter_var($data->product_id, FILTER_SANITIZE_NUMBER_INT);
        $quantity = filter_var($data->quantity, FILTER_SANITIZE_NUMBER_INT);

        try {
            $update_query = "UPDATE CART SET quantity = :quantity WHERE user_id = :user_id AND product_id = :product_id";
            $stmt = $conn->prepare($update_query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindParam(":product_id", $product_id);
            $stmt->bindParam(":quantity", $quantity);

            if ($stmt->execute()) {
                $affected_rows = $stmt->rowCount();
                if ($affected_rows > 0) {
                    logMessage("Cart item quantity updated successfully");
                    sendJsonResponse(200, "Cart item quantity updated.");
                } else {
                    logMessage("No cart item found to update");
                    sendJsonResponse(404, "No cart item found to update.");
                }
            } else {
                logMessage("Failed to update cart item quantity");
                sendJsonResponse(503, "Unable to update cart item quantity.");
            }
        } catch (PDOException $exception) {
            logMessage("Database error in PUT request: " . $exception->getMessage());
            sendJsonResponse(500, "Database error: " . $exception->getMessage());
        }
    } else {
        logMessage("PUT request failed: Incomplete data");
        sendJsonResponse(400, "Incomplete data. Required fields: user_id, product_id, quantity");
    }
}

logMessage("Request processing completed");
?>