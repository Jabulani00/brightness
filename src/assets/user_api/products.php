<?php
// CORS headers
header("Access-Control-Allow-Origin: http://localhost:8100");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *"); // Allow all origins for development
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");

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

// Handle POST request for inserting data
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $postdata = file_get_contents("php://input");

    if (isset($postdata) && !empty($postdata)) {
        $request = json_decode($postdata);
        
        // Sanitize inputs
        $name = mysqli_real_escape_string($conn, trim($request->name));
        $description = mysqli_real_escape_string($conn, trim($request->description));
        $price = (float) $request->price;
        $stock_quantity = (int) $request->stock_quantity;
        $category = mysqli_real_escape_string($conn, trim($request->category));
        $barcode = mysqli_real_escape_string($conn, trim($request->barcode));
        $image_url = mysqli_real_escape_string($conn, trim($request->image_url));

        // Set default total_ratings and average_rating to 0
        $total_ratings = 0;
        $average_rating = 0.00;

        // Check if the name or barcode already exists in the 'products' table
        $checkQuery = "SELECT * FROM products WHERE name='$name' OR barcode='$barcode'";
        $checkResult = $conn->query($checkQuery);

        if ($checkResult->num_rows > 0) {
            // If a product with the same name or barcode exists
            $response = ['status' => 0, 'message' => 'Product with the same name or barcode already exists.'];
        } else {
            // Insert data into the 'products' table with total_ratings and average_rating
            $sql = "INSERT INTO products (name, description, price, stock_quantity, category, barcode, image_url, total_ratings, average_rating) 
            VALUES ('$name', '$description', '$price', '$stock_quantity', '$category', '$barcode', '$image_url', '$total_ratings', '$average_rating')";

            if ($conn->query($sql) === TRUE) {
                // Get the last inserted product_id
                $product_id = mysqli_insert_id($conn);

                // Include product_id in the response
                $response = ['status' => 1, 'message' => 'Product added successfully.', 'product_id' => $product_id];
            } else {
                $response = ['status' => 0, 'message' => 'Error: ' . $conn->error];
            }
        }

        echo json_encode($response);
    }
}

// Handle GET request to fetch products
elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Check if we're requesting a specific product's quantity
    if (isset($_GET['check_quantity']) && isset($_GET['product_id'])) {
        $product_id = (int)$_GET['product_id'];
        
        // Query to get the stock quantity of the specific product
        $sql = "SELECT stock_quantity FROM products WHERE product_id = $product_id";
        $result = $conn->query($sql);

        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            echo json_encode(['quantity' => (int)$row['stock_quantity']]);
        } else {
            echo json_encode(['error' => 'Product not found']);
        }
    } else {
        // Existing code for fetching products
        // Extract optional query parameters (category, searchTerm, sortBy)
        $category = isset($_GET['category']) ? mysqli_real_escape_string($conn, $_GET['category']) : null;
        $searchTerm = isset($_GET['searchTerm']) ? mysqli_real_escape_string($conn, $_GET['searchTerm']) : null;
        $sortBy = isset($_GET['sortBy']) ? mysqli_real_escape_string($conn, $_GET['sortBy']) : null;

        // Base SQL query
        $sql = "SELECT * FROM products WHERE 1";

        // Apply filters if provided
        if ($category) {
            $sql .= " AND category = '$category'";
        }
        if ($searchTerm) {
            $sql .= " AND (name LIKE '%$searchTerm%' OR description LIKE '%$searchTerm%')";
        }

        // Apply sorting if provided
        if ($sortBy) {
            $sql .= " ORDER BY $sortBy";
        }

        // Execute query
        $result = $conn->query($sql);

        // Prepare response data
        $data = [];
        if ($result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
        }

        // Send response
        echo json_encode($data);
    }
}

// Handle PUT request to update a product
elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $postdata = file_get_contents("php://input");
    parse_str(parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY), $query);

    if (isset($postdata) && isset($query['id']) && !empty($query['id'])) {
        $request = json_decode($postdata);
        $id = (int)$query['id'];

        // Fetch the current product data
        $fetch_sql = "SELECT * FROM products WHERE product_id = $id";
        $result = $conn->query($fetch_sql);
        
        if ($result->num_rows > 0) {
            $current_product = $result->fetch_assoc();

            // Sanitize inputs
            $name = isset($request->name) ? mysqli_real_escape_string($conn, trim($request->name)) : $current_product['name'];
            $description = isset($request->description) ? mysqli_real_escape_string($conn, trim($request->description)) : $current_product['description'];
            $price = isset($request->price) ? (float)$request->price : $current_product['price'];
            $category = isset($request->category) ? mysqli_real_escape_string($conn, trim($request->category)) : $current_product['category'];
            $barcode = isset($request->barcode) ? mysqli_real_escape_string($conn, trim($request->barcode)) : $current_product['barcode'];
            $image_url = isset($request->image_url) ? mysqli_real_escape_string($conn, trim($request->image_url)) : $current_product['image_url'];
            $total_ratings = isset($request->total_ratings) ? (int)$request->total_ratings : $current_product['total_ratings'];
            $average_rating = isset($request->average_rating) ? (float)$request->average_rating : $current_product['average_rating'];

            // Handle quantity update
            if (isset($request->stock_quantity)) {
                if (isset($request->quantity_operation) && $request->quantity_operation === 'add') {
                    $stock_quantity = $current_product['stock_quantity'] + (int)$request->stock_quantity;
                } elseif (isset($request->quantity_operation) && $request->quantity_operation === 'subtract') {
                    $stock_quantity = $current_product['stock_quantity'] - (int)$request->stock_quantity;
                    $stock_quantity = max(0, $stock_quantity); // Ensure quantity doesn't go below 0
                } else {
                    $stock_quantity = (int)$request->stock_quantity;
                }
            } else {
                $stock_quantity = $current_product['stock_quantity'];
            }

            // Update data in the 'products' table
            $sql = "UPDATE products SET 
                    name='$name', description='$description', price='$price', stock_quantity='$stock_quantity', 
                    category='$category', barcode='$barcode', image_url='$image_url', 
                    total_ratings='$total_ratings', average_rating='$average_rating'
                    WHERE product_id=$id";

            if ($conn->query($sql) === TRUE) {
                $response = ['status' => 1, 'message' => 'Product updated successfully.', 'new_quantity' => $stock_quantity];
            } else {
                $response = ['status' => 0, 'message' => 'Error: ' . $conn->error];
            }
        } else {
            $response = ['status' => 0, 'message' => 'Product not found.'];
        }

        echo json_encode($response);
    }
}

// Handle DELETE request to delete a product
elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    parse_str(parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY), $query);

    if (isset($query['id']) && !empty($query['id'])) {
        $id = (int)$query['id'];

        // Delete data from the 'products' table
        $sql = "DELETE FROM products WHERE product_id=$id";

        if ($conn->query($sql) === TRUE) {
            $response = ['status' => 1, 'message' => 'Product deleted successfully.'];
        } else {
            $response = ['status' => 0, 'message' => 'Error: ' . $conn->error];
        }

        echo json_encode($response);
    }
}
$conn->close();
?>
