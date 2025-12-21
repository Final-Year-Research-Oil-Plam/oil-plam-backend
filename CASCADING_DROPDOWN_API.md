# Cascading Dropdown & Prediction API

## 📋 Flow Overview

```
User opens form
    ↓
1. Load Blocks Dropdown
    ↓
2. User selects Block → Load Trees for that Block
    ↓
3. User selects Tree
    ↓
4. User uploads Image → Predict Bunch Count
```

---

## 🔗 API Endpoints

### **1. Get All Blocks (First Dropdown)**

**Endpoint:** `GET /api/blocks`

**Response:**
```json
{
  "success": true,
  "message": "Blocks fetched successfully",
  "data": [
    {
      "id": "BLOCK-A",
      "name": "North Section A",
      "areaSize": "2.5 hectares"
    },
    {
      "id": "BLOCK-B",
      "name": "North Section B",
      "areaSize": "3.0 hectares"
    }
  ]
}
```

---

### **2. Get Trees by Block (Second Dropdown - Cascading)**

**Endpoint:** `GET /api/trees/by-block/:blockId`

**Example:** `GET /api/trees/by-block/BLOCK-A`

**Response:**
```json
{
  "success": true,
  "message": "Trees fetched successfully",
  "count": 3,
  "data": [
    {
      "id": 1,
      "treeNumber": "TREE-BLOCK-A-001",
      "blockId": "BLOCK-A"
    },
    {
      "id": 2,
      "treeNumber": "TREE-BLOCK-A-002",
      "blockId": "BLOCK-A"
    },
    {
      "id": 3,
      "treeNumber": "TREE-BLOCK-A-003",
      "blockId": "BLOCK-A"
    }
  ]
}
```

---

### **3. Predict Bunch Count (Upload Image)**

**Endpoint:** `POST /api/bunches/predict`

**Content-Type:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | ✅ Yes | Image file (jpg, png) |
| `blockId` | String | ✅ Yes | Selected block ID (e.g., "BLOCK-A") |
| `treeId` | String | ✅ Yes | Selected tree ID (e.g., "1") |

**Example Request (JavaScript/Fetch):**
```javascript
const formData = new FormData();
formData.append('image', imageFile); // File object
formData.append('blockId', 'BLOCK-A');
formData.append('treeId', '1');

const response = await fetch('http://localhost:3000/api/bunches/predict', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

**Success Response:**
```json
{
  "success": true,
  "message": "Prediction successful",
  "data": {
    "predictedBunches": 12,
    "confidence": 0.87,
    "timestamp": "2025-12-21T10:30:45.123Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Block ID and Tree ID are required"
}
```

---

## 🎯 Frontend Implementation Example

```javascript
// 1. Load blocks on page load
useEffect(() => {
  const fetchBlocks = async () => {
    const response = await fetch('http://localhost:3000/api/blocks');
    const data = await response.json();
    setBlocks(data.data); // Set blocks for first dropdown
  };
  fetchBlocks();
}, []);

// 2. When user selects a block, load trees
const handleBlockChange = async (selectedBlockId) => {
  setSelectedBlock(selectedBlockId);
  setSelectedTree(null); // Reset tree selection
  
  const response = await fetch(`http://localhost:3000/api/trees/by-block/${selectedBlockId}`);
  const data = await response.json();
  setTrees(data.data); // Set trees for second dropdown
};

// 3. When user uploads image, predict
const handleImageUpload = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('blockId', selectedBlock);
  formData.append('treeId', selectedTree);
  
  const response = await fetch('http://localhost:3000/api/bunches/predict', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Predicted Bunches:', result.data.predictedBunches);
    console.log('Confidence:', result.data.confidence);
  }
};
```

---

## ✅ Complete Flow

1. **Page loads** → Call `GET /api/blocks` → Populate Block dropdown
2. **User selects Block** → Call `GET /api/trees/by-block/:blockId` → Populate Tree dropdown
3. **User selects Tree** → Enable image upload
4. **User uploads Image** → Call `POST /api/bunches/predict` → Show prediction result

---

## 🔧 Testing with cURL

```bash
# 1. Get all blocks
curl http://localhost:3000/api/blocks

# 2. Get trees for BLOCK-A
curl http://localhost:3000/api/trees/by-block/BLOCK-A

# 3. Predict bunch count
curl -X POST http://localhost:3000/api/bunches/predict \
  -F "image=@/path/to/image.jpg" \
  -F "blockId=BLOCK-A" \
  -F "treeId=1"
```

---

## 📌 Notes

- The prediction endpoint currently returns **mock data** (random bunches 5-20, confidence 0.70-1.00)
- Replace the mock prediction with your **FastAPI ML model** call when ready
- Image files are stored in `uploads/` directory
- Predictions are saved to the `predictions` table in the database
