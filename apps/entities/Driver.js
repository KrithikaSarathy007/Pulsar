{ 
  "name": "Driver",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Driver full name"
    },
    "username": {
      "type": "string"
    },
    "password": {
      "type": "string"
    },
    "ambulance_id": {
      "type": "string",
      "description": "Ambulance vehicle ID"
    },
    "experience_years": {
      "type": "number",
      "default": 0
    },
    "is_approved": {
      "type": "boolean",
      "default": false
    },
    "is_available": {
      "type": "boolean",
      "default": true
    },
    "phone": {
      "type": "string"
    },
    "current_lat": {
      "type": "number"
    },
    "current_lng": {
      "type": "number"
    },
    "profile_image": {
      "type": "string"
    }
  },
  "required": [
    "name",
    "username",
    "password",
    "ambulance_id"
  ]
}
