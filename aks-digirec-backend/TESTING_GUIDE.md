# Workers Activity Testing Guide

## Quick Start - Add 10 Test Workers

### Step 1: Setup Database Connection
Ensure your `.env` file has MongoDB URI configured:
```env
MONGODB_URI=mongodb://localhost:27017/digirec
# or
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/digirec
```

### Step 2: Run Seed Script
```bash
# Navigate to backend directory
cd aks-digirec-backend

# Run the seed script
node scripts/seedTestWorkers.js
```

**Expected Output**:
```
Connecting to MongoDB...
Connected to MongoDB

Using company: Test Company (ObjectID...)

Setting up section groups...
  ✓ Clay Group: Created
  ✓ Glaze & Color Group: Created

Creating test workers...
  ✓ CLAY001 - Ahmed Hussain
  ✓ CLAY002 - Bilal Khan
  ... (7 more workers)

Creating test activities...
    Created activity for CLAY001 on Thu Apr 03 2026
    ... (5 activities per worker)

==================================================
SEED COMPLETE!
==================================================
Total workers defined: 10
Workers created: 10
Workers already existed: 0
Test activities created: 50
Section Groups: Clay Group, Glaze & Color Group
==================================================

Disconnected from MongoDB
```

### Step 3: Verify Data in Application

#### A. Check Workers Activity UI
1. Open Workers Activity page in the application
2. Select date: Today (08/04/2026)
3. Filter by section group
4. Should see:
   - 5 workers from Clay Group
   - 5 workers from Glaze & Color Group
   - Each showing attendance, hours, and balances

#### B. API Testing

**Get Section Groups**:
```bash
curl -X GET http://localhost:3000/api/workers/section-groups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected Response:
```json
{
  "success": true,
  "data": [
    { "id": "Clay Group", "label": "Clay Group" },
    { "id": "Glaze & Color Group", "label": "Glaze & Color Group" }
  ]
}
```

**Get Worker Activities for Today**:
```bash
curl -X GET "http://localhost:3000/api/workers/activities?date=2026-04-08&sectionGroup=Clay Group" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "code": "CLAY001",
      "workerName": "Ahmed Hussain",
      "group": "Clay Group",
      "attendance": "present",
      "checkIn": "2026-04-03T08:00:00.000Z",
      "checkOut": "2026-04-03T16:00:00.000Z",
      "hours": 8,
      "balanceBF": 0,
      "workedAmount": 2000,
      "advanceDaily": 0,
      "amountToPay": 2000,
      "paid": 0,
      "balanceCF": 2000,
      "status": "approved",
      "activityCount": 1
    },
    ...
  ]
}
```

---

## Manual Testing Scenarios

### Scenario 1: Create New Activity
```bash
curl -X POST http://localhost:3000/api/workers/activities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "PUT_WORKER_ID_HERE",
    "date": "2026-04-08",
    "activityType": "production",
    "timeTracking": {
      "checkIn": "2026-04-08T08:00:00Z",
      "checkOut": "2026-04-08T17:00:00Z"
    },
    "production": {
      "quantityProduced": 150,
      "quantityApproved": 145,
      "quantityRejected": 5
    }
  }'
```

### Scenario 2: Close Day
```bash
curl -X POST http://localhost:3000/api/workers/close-day \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "date": "2026-04-06" }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Day closed successfully. X activities updated.",
  "data": { "modifiedCount": 5 }
}
```

### Scenario 3: Close Week
```bash
curl -X POST http://localhost:3000/api/workers/close-week \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "date": "2026-04-06" }'
```

---

## Validation Testing

### Test Invalid Date
```bash
curl -X GET "http://localhost:3000/api/workers/activities?date=invalid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected Error:
```json
{
  "success": false,
  "message": "Date is required"
}
```

### Test Invalid Activity Type
```bash
curl -X POST http://localhost:3000/api/workers/activities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "...",
    "date": "2026-04-08",
    "activityType": "invalid_type"
  }'
```

Expected Error:
```json
{
  "success": false,
  "message": "Validation failed"
}
```

---

## Database Browser Queries

### Check All Workers Created
```javascript
// MongoDB/Compass
db.workers.find({ code: /^(CLAY|GLAZ)/ }).count()
// Should return: 10
```

### Check Activities for Today
```javascript
db.workeractivities.find({
  date: {
    $gte: new Date("2026-04-08T00:00:00Z"),
    $lte: new Date("2026-04-08T23:59:59Z")
  }
}).count()
// Should return activities for today
```

### Check Attendance Statistics
```javascript
db.workers.aggregate([
  { $match: { code: /^(CLAY|GLAZ)/ } },
  { $group: {
    _id: null,
    totalWorkers: { $sum: 1 },
    totalPresent: { $sum: "$attendance.present" },
    totalAbsent: { $sum: "$attendance.absent" }
  }}
])
```

---

## Performance Testing

### Load Test: Create 100 Activities
```bash
#!/bin/bash
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/workers/activities \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"workerId\": \"WORKER_ID\",
      \"date\": \"2026-04-08\",
      \"activityType\": \"production\"
    }" &
done
wait
```

Monitor response times and ensure no errors occur.

---

## Troubleshooting

### Issue: "Worker not found"
- Verify the seed script completed successfully
- Check if workers were created in correct company

### Issue: "Invalid date format"
- Use ISO format: YYYY-MM-DD or timestamp
- Avoid timezone issues by using UTC dates

### Issue: Activities not appearing
- Verify date is within activity date range
- Check if activities are in correct company
- Verify user has `workers.view` permission

### Issue: Worker already exists error
- Different workers have been created before
- Clean database or update worker code in seed script
- Or just run seed script again (it skips existing workers)

---

## Cleanup

### Remove Test Data
```bash
# Remove test workers (MongoDB)
db.workers.deleteMany({ code: /^(CLAY|GLAZ)/ })

# Remove test activities
db.workeractivities.deleteMany({})

# Remove test users/roles if needed
db.roles.deleteMany({ name: "admin", isSystem: false })
```

---

## Next Steps

1. ✅ Run seed script to create test workers
2. ✅ Test UI to see workers and activities
3. ✅ Run API tests to verify endpoints
4. ✅ Test validation scenarios
5. ✅ Monitor performance metrics
6. ✅ Verify wage calculations
7. ✅ Test approval workflows
8. ✅ Clean up test data when done

---

**Last Updated**: April 8, 2026
**Status**: Ready for Testing
