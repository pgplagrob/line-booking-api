const BASE_URL = "https://jsonplaceholder.typicode.com";

// ฟังก์ชันกลางสำหรับเรียก API และเช็ก Error
async function fetchAPI(endpoint) {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
  }
  return await response.json();
}

async function inspectData() {
  try {
    // 1. ดึงข้อมูล Users แล้วแกะเอาเฉพาะ name กับ email
    const users = await fetchAPI("/users");
    const userSummary = users.map(({ id, name, email }) => ({ id, name, email }));
    console.log("--- Users Summary ---", userSummary.slice(0, 3)); // แสดง 3 รายการแรก



  } catch (error) {
    console.error("Error fetching API:", error.message);
  }
}

inspectData();
