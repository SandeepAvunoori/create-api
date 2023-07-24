// Require the modules needed
const express = require('express');
const axios = require('axios');

// Create an express app
const app = express();

// Define the port number
const port = 3000;

// Define a global variable to store the data from the third party API
let data = [];

// Define a function to fetch the data from the third party API using axios
const fetchData = async () => {
  try {
    // Get the JSON data from the third party API
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    // Assign the data to the global variable
    data = response.data;
  } catch (error) {
    // Handle any errors
    console.error(error);
  }
};

// Call the fetchData function once at the start of the app
fetchData();

// Define a middleware function to check if the data is loaded before processing any requests
const checkData = (req, res, next) => {
  // If the data is empty, send a 503 service unavailable response
  if (data.length === 0) {
    return res.status(503).send('Data is not loaded yet. Please try again later.');
  } else {
    // Otherwise, proceed to the next middleware or route handler
    next();
  }
};

// Use the checkData middleware for all requests
app.use(checkData);

// Define a helper function to filter the data by month
const filterByMonth = (month) => {
  // Convert the month to lowercase and trim any whitespace
  month = month.toLowerCase().trim();
  // Define an array of valid months
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  // Check if the month is valid
  if (months.includes(month)) {
    // Get the index of the month in the array (0-based)
    const index = months.indexOf(month);
    // Filter the data by matching the month part of the dateOfSale field with the index + 1 (1-based)
    return data.filter(item => new Date(item.dateOfSale).getMonth() === index);
  } else {
    // If the month is invalid, return an empty array
    return [];
  }
};

// API for statistics
app.get('/api/statistics', (req, res) => {
  const { month } = req.query;
  // Filter the data by the selected month
  const filteredData = filterByMonth(month);
  
  // Calculate the total sale amount for the selected month
  const totalSaleAmount = filteredData.reduce((acc, item) => acc + item.price, 0);
  
  // Calculate the total number of sold items for the selected month
  const totalSoldItems = filteredData.filter(item => item.sold).length;
  
  // Calculate the total number of unsold items for the selected month
  const totalUnsoldItems = filteredData.filter(item => !item.sold).length;
  
  res.json({
    totalSaleAmount,
    totalSoldItems,
    totalUnsoldItems
  });
});

// API for bar chart
app.get('/api/bar_chart', (req, res) => {
  const { month } = req.query;
  // Filter the data by the selected month
  const filteredData = filterByMonth(month);
  
  // Define the price ranges for the bar chart
  const priceRanges = {
    '0-100': 0,
    '101-200': 0,
    '201-300': 0,
    '301-400': 0,
    '401-500': 0,
    '501-600': 0,
    '601-700': 0,
    '701-800': 0,
    '801-900': 0,
    '901-above': 0
  };
  
  // Count the number of items in each price range
  filteredData.forEach(item => {
    const price = item.price;
    if (price <= 100) {
      priceRanges['0-100']++;
    } else if (price <= 200) {
      priceRanges['101-200']++;
    } else if (price <= 300) {
      priceRanges['201-300']++;
    } else if (price <= 400) {
      priceRanges['301-400']++;
    } else if (price <= 500) {
      priceRanges['401-500']++;
    } else if (price <= 600) {
      priceRanges['501-600']++;
    } else if (price <= 700) {
      priceRanges['601-700']++;
    } else if (price <= 800) {
      priceRanges['701-800']++;
    } else if (price <= 900) {
      priceRanges['801-900']++;
    } else {
      priceRanges['901-above']++;
    }
  });
  
  res.json(priceRanges);
});

// API for pie chart
app.get('/api/pie_chart', (req, res) => {
  const { month } = req.query;
  // Filter the data by the selected month
  const filteredData = filterByMonth(month);
  
  // Count the number of items in each category
  const categoryCount = {};
  filteredData.forEach(item => {
    const category = item.category;
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  
  res.json(categoryCount);
});

// Combined API
app.get('/api/combined', async (req, res) => {
  const { month } = req.query;
  
  try {
    // Call the three APIs to fetch data for the given month
    const statisticsResponse = await axios.get(`http://localhost:${port}/api/statistics?month=${month}`);
    const barChartResponse = await axios.get(`http://localhost:${port}/api/bar_chart?month=${month}`);
    const pieChartResponse = await axios.get(`http://localhost:${port}/api/pie_chart?month=${month}`);
  
    // Combine the responses into a single JSON object
    const combinedData = {
      statistics: statisticsResponse.data,
      bar_chart: barChartResponse.data,
      pie_chart: pieChartResponse.data,
    };
  
    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch combined data.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Default route handler for the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the API! Use the appropriate endpoints for the desired functionality.');
});  