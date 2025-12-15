# Prompts to regenerate the codes for "deep dive into the process of debugging llms with tools calls"


## Steps:
1. I am building a robust backend server (with NodeJS) and I want to practice looking under the hood of LLMs and how they interact with tools. My goal is to demistify the debugging process with some simple code and something that clearly shows how an LLM function calling can go wrong. give me a starter for building a nodejs based fetch of the openai api where i want to use the function calling to grab news from the news api. Make sure to provide clean code in separate files and then import tools and functions into the server file to call the api. This fetch should be used to call openai api and the news api as a tool or function. Make sure to consider the proper ES module imports and exports. and the type be set to module in the package.json. Add proper logging on the server side to see the requests and responses.

2. Now I want you to add the apify google maps scraper as another tool to the existing code. Make sure to update the function calling structure and consider proper handling of the function calls and the results should be structured in a JSON output taylored for the openai api message list formation.

3. Now I want you to add the google gemini api as another llm option to the existing code. Make sure to update the function calling structure and consider proper handling of the function calls and the results should be structured in a JSON output taylored for the openai api message list formation. Make sure to use the google genai npm package for this.

4. Add two more simple tools to the existing code: a unit converter (Celsius to Fahrenheit, Fahrenheit to Celsius, km to miles) and a get_time function that returns the current server time. Update the documentation accordingly.

5. Create a Python version of the server using FastAPI with the same tools and endpoints. The Python server should have the same structure with separate files for functions, tools, and the server.

6. Create Dockerfiles and .dockerignore files for both the Node.js and Python servers. The Dockerfiles should:
   - Use lightweight base images (node:20-alpine for JS, python:3.12-slim for Python)
   - Copy only essential application files
   - Install production dependencies only
   - Expose the appropriate ports (3000 for Node.js, 8000 for Python)
   - The .dockerignore files should exclude node_modules, .env files, documentation, virtual environments, cache files, and other non-essential files to keep the images small.
7. Add comprehensive documentation to the HowToRun.md file explaining how to push the Docker images to Google Cloud Container Registry (GCR) and Artifact Registry. Include:
   - Prerequisites (Google Cloud SDK, project setup, billing)
   - Step-by-step authentication with gcloud
   - Finding the correct PROJECT_ID (not Project Name) and configuring the project
   - Enabling the Artifact Registry API
   - Configuring Docker for GCR authentication
   - Tagging Docker images with the GCR path format
   - Pushing images to GCR with detailed commands
   - Verifying pushed images and pulling on other machines
   - A troubleshooting section covering common errors like PERMISSION_DENIED, API not enabled, and billing issues
   - An alternative section for using the newer Google Artifact Registry format with region-specific repositories
   - Do NOT include any personal project IDs or credentials in the documentation
```
