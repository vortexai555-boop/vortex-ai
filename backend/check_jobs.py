import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_jobs():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client["grexo"]
    jobs = await db.website_jobs.find().sort("created_at", -1).limit(5).to_list(5)
    for j in jobs:
        print(j.get("status"), j.get("error"))

asyncio.run(check_jobs())
