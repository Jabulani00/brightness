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

function getDateColumnName($conn) {
    $result = $conn->query("DESCRIBE sales");
    if ($result === false) {
        throw new Exception($conn->error);
    }
    
    $dateColumns = ['created_at', 'sale_date', 'transaction_date', 'date'];
    while ($row = $result->fetch_assoc()) {
        if (in_array($row['Field'], $dateColumns)) {
            return $row['Field'];
        }
    }
    throw new Exception("No suitable date column found in the sales table");
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "best";

try {
    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        logMessage("Received data: " . print_r($data, true));
        
        if (isset($data['order_id'], $data['cashier_id'], $data['total_amount'], $data['payment_method'], $data['amount_paid'])) {
            $order_id = $conn->real_escape_string($data['order_id']);
            $cashier_id = $conn->real_escape_string($data['cashier_id']);
            $total_amount = $conn->real_escape_string($data['total_amount']);
            $payment_method = $conn->real_escape_string($data['payment_method']);
            $amount_paid = $conn->real_escape_string($data['amount_paid']);

            $sql = "INSERT INTO SALES (order_id, cashier_id, total_amount, payment_method, amount_paid) 
                    VALUES ('$order_id', '$cashier_id', '$total_amount', '$payment_method', '$amount_paid')";

            logMessage("SQL Query: " . $sql);

            if ($conn->query($sql) === TRUE) {
                $sale_id = $conn->insert_id;
                sendJsonResponse(["success" => true, "message" => "Sale record created successfully", "sale_id" => $sale_id]);
            } else {
                throw new Exception("Error: " . $conn->error);
            }
        } else {
            sendJsonResponse(["success" => false, "error" => "Missing required fields"], 400);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['total_only']) && $_GET['total_only'] === 'true') {
            $sql = "SELECT SUM(total_amount) AS totalSalesAmount FROM sales";
            $result = $conn->query($sql);
            $totalSalesAmount = 0;

            if ($result && $row = $result->fetch_assoc()) {
                $totalSalesAmount = $row['totalSalesAmount'];
            }

            sendJsonResponse(['totalSalesAmount' => $totalSalesAmount]);
        } elseif (isset($_GET['filter'])) {
            $filter = $_GET['filter'];
            $dateColumn = getDateColumnName($conn);
            
            switch ($filter) {
                case 'day':
                    $sql = "SELECT DATE($dateColumn) as date, SUM(total_amount) as total_amount 
                            FROM sales 
                            WHERE $dateColumn >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
                            GROUP BY DATE($dateColumn)
                            ORDER BY DATE($dateColumn)";
                    break;
                case 'week':
                    $sql = "SELECT DATE($dateColumn) as date, SUM(total_amount) as total_amount 
                            FROM sales 
                            WHERE $dateColumn >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)
                            GROUP BY DATE($dateColumn)
                            ORDER BY DATE($dateColumn)";
                    break;
                case 'month':
                    $sql = "SELECT DATE($dateColumn) as date, SUM(total_amount) as total_amount 
                            FROM sales 
                            WHERE $dateColumn >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                            GROUP BY DATE($dateColumn)
                            ORDER BY DATE($dateColumn)";
                    break;
                case 'year':
                    $sql = "SELECT DATE_FORMAT($dateColumn, '%Y-%m') as date, SUM(total_amount) as total_amount 
                            FROM sales 
                            WHERE $dateColumn >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
                            GROUP BY DATE_FORMAT($dateColumn, '%Y-%m')
                            ORDER BY DATE_FORMAT($dateColumn, '%Y-%m')";
                    break;
                default:
                    throw new Exception('Invalid filter parameter');
            }

            $result = $conn->query($sql);
            if ($result === false) {
                throw new Exception($conn->error);
            }

            $salesData = [];
            while ($row = $result->fetch_assoc()) {
                $salesData[] = [
                    'date' => $row['date'],
                    'total_amount' => floatval($row['total_amount'])
                ];
            }

            sendJsonResponse($salesData);
        } else {
            $sql = "SELECT * FROM sales";
            $result = $conn->query($sql);

            $salesData = [];
            $totalSalesAmount = 0;

            if ($result->num_rows > 0) {
                while ($row = $result->fetch_assoc()) {
                    $salesData[] = $row;
                    $totalSalesAmount += $row['total_amount'];
                }
            }

            sendJsonResponse([
                'salesData' => $salesData,
                'totalSalesAmount' => $totalSalesAmount
            ]);
        }
    } else {
        sendJsonResponse(['error' => 'Invalid request method'], 405);
    }
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    sendJsonResponse([
        'error' => 'An error occurred while processing your request',
        'details' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], 500);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>