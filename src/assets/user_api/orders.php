<?php
header("Access-Control-Allow-Origin: http://localhost:8100");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
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

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(array("success" => false, "message" => "Connection failed: " . $conn->connect_error)));
}

// Handle POST request for inserting a new order
// Handle POST request for inserting a new order
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents("php://input");
    $data = json_decode($input);

    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Invalid JSON: " . json_last_error_msg());
        die(json_encode(array("success" => false, "message" => "Invalid JSON: " . json_last_error_msg())));
    }

    error_log("Received data: " . print_r($data, true));

    // Prepare and bind for ORDERS table
    $stmt = $conn->prepare("INSERT INTO ORDERS (user_id, total_amount, order_type, status) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        error_log("Prepare failed: " . $conn->error);
        die(json_encode(array("success" => false, "message" => "Prepare failed: " . $conn->error)));
    }

    $stmt->bind_param("idss", $data->user_id, $data->total_amount, $data->order_type, $data->status);

    // Execute the statement
    if ($stmt->execute()) {
        $order_id = $conn->insert_id; // Capture the order_id
        
        // Insert order items
        $stmt_items = $conn->prepare("INSERT INTO ORDER_ITEMS (order_id, product_id, quantity, price_per_unit) VALUES (?, ?, ?, ?)");
        if (!$stmt_items) {
            error_log("Prepare items failed: " . $conn->error);
            die(json_encode(array("success" => false, "message" => "Prepare items failed: " . $conn->error)));
        }

        foreach ($data->items as $item) {
            $stmt_items->bind_param("iiid", $order_id, $item->product_id, $item->quantity, $item->price);
            if (!$stmt_items->execute()) {
                error_log("Execute items failed: " . $stmt_items->error);
                die(json_encode(array("success" => false, "message" => "Execute items failed: " . $stmt_items->error)));
            }
        }
        $stmt_items->close();
        
        // Return success message with order_id
        echo json_encode(array("success" => true, "message" => "Order placed successfully", "order_id" => $order_id));
    } else {
        error_log("Failed to place order: " . $stmt->error);
        echo json_encode(array("success" => false, "message" => "Failed to place order: " . $stmt->error));
    }

    $stmt->close();
}

// Handle GET request
else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Check if count=true parameter is passed
    if (isset($_GET['count']) && $_GET['count'] === 'true') {
        // Count the total number of orders
        $sql = "SELECT COUNT(*) AS order_count FROM ORDERS"; 
        $result = $conn->query($sql);

        if ($result && $row = $result->fetch_assoc()) {
            echo json_encode(['order_count' => $row['order_count']]);
        } else {
            echo json_encode(['order_count' => 0]);
        }
    } else if (isset($_GET['id'])) {
        // View a specific order
        $order_id = $_GET['id'];
        $sql = "SELECT * FROM ORDERS WHERE order_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $order_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $order = $result->fetch_assoc();
            
            // Fetch order items
            $items_sql = "SELECT * FROM ORDER_ITEMS WHERE order_id = ?";
            $items_stmt = $conn->prepare($items_sql);
            $items_stmt->bind_param("i", $order_id);
            $items_stmt->execute();
            $items_result = $items_stmt->get_result();
            
            $order['items'] = [];
            while ($item = $items_result->fetch_assoc()) {
                $order['items'][] = $item;
            }
            
            echo json_encode(array("success" => true, "order" => $order));
        } else {
            echo json_encode(array("success" => false, "message" => "Order not found"));
        }
    } else {
        // Return all orders data (original functionality)
        $sql = "SELECT * FROM ORDERS"; 
        $result = $conn->query($sql);

        $data = [];
        if ($result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
        }

        echo json_encode(['orderData' => $data]);
    }
}
// Handle PUT request for updating an order
else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    $order_id = isset($_GET['id']) ? $_GET['id'] : null;
    
    if (!$order_id) {
        die(json_encode(array("success" => false, "message" => "Order ID is required")));
    }
    
    $status = isset($data['status']) ? $data['status'] : null;
    $previousStatus = isset($data['previousStatus']) ? $data['previousStatus'] : null;
    
    if (!$status) {
        die(json_encode(array("success" => false, "message" => "Status is required")));
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Update order status
        $sql = "UPDATE ORDERS SET status = ? WHERE order_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $status, $order_id);
        $stmt->execute();
        
        // If new status is "order-processed" and previous status wasn't, update product quantities
        if ($status === 'order-processed' && $previousStatus !== 'order-processed') {
            // Get order items
            $items_sql = "SELECT product_id, quantity FROM ORDER_ITEMS WHERE order_id = ?";
            $items_stmt = $conn->prepare($items_sql);
            $items_stmt->bind_param("i", $order_id);
            $items_stmt->execute();
            $items_result = $items_stmt->get_result();
            
            while ($item = $items_result->fetch_assoc()) {
                // Update product quantity
                $update_product_sql = "UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?";
                $update_product_stmt = $conn->prepare($update_product_sql);
                $update_product_stmt->bind_param("ii", $item['quantity'], $item['product_id']);
                $update_product_stmt->execute();
            }
        }
        // If previous status was "order-processed" and new status isn't, restore product quantities
        else if ($previousStatus === 'order-processed' && $status !== 'order-processed') {
            // Get order items
            $items_sql = "SELECT product_id, quantity FROM ORDER_ITEMS WHERE order_id = ?";
            $items_stmt = $conn->prepare($items_sql);
            $items_stmt->bind_param("i", $order_id);
            $items_stmt->execute();
            $items_result = $items_stmt->get_result();
            
            while ($item = $items_result->fetch_assoc()) {
                // Update product quantity
                $update_product_sql = "UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?";
                $update_product_stmt = $conn->prepare($update_product_sql);
                $update_product_stmt->bind_param("ii", $item['quantity'], $item['product_id']);
                $update_product_stmt->execute();
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode(array("success" => true, "message" => "Order status updated successfully"));
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        echo json_encode(array("success" => false, "message" => "Failed to update order: " . $e->getMessage()));
    }
}
// Handle DELETE request for deleting an order
else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $order_id = isset($_GET['id']) ? $_GET['id'] : null;
    
    if (!$order_id) {
        die(json_encode(array("success" => false, "message" => "Order ID is required")));
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Delete order items first
        $delete_items_sql = "DELETE FROM ORDER_ITEMS WHERE order_id = ?";
        $delete_items_stmt = $conn->prepare($delete_items_sql);
        $delete_items_stmt->bind_param("i", $order_id);
        $delete_items_stmt->execute();
        
        // Then delete the order
        $delete_order_sql = "DELETE FROM ORDERS WHERE order_id = ?";
        $delete_order_stmt = $conn->prepare($delete_order_sql);
        $delete_order_stmt->bind_param("i", $order_id);
        $delete_order_stmt->execute();
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode(array("success" => true, "message" => "Order deleted successfully"));
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        echo json_encode(array("success" => false, "message" => "Failed to delete order: " . $e->getMessage()));
    }
}
else {
    error_log("Invalid request method: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(array("success" => false, "message" => "Invalid request method"));
}

$conn->close();
?>