# debug-nodejs-llm-tools
This repo dives deep into how to resolve issues and errors with backend applications with LLM tool calling capabilities.

# Overview
This repository provides a simple Node.js application that demonstrates how to debug issues that arise when using Large Language Models (LLMs) with function calling capabilities. The code includes intentional bugs and errors to illustrate common pitfalls and how to resolve them.

# Setup Instructions
1. **Clone the Repository**:
2. ```bash
   git clone https://github.com/hadi2525/debug-nodejs-llm-tools.git
   ```
3. **Navigate to the Project Directory**:
   ```bash
   cd debug-nodejs-llm-tools
   ```
4. **Install Dependencies**:
   ```bash
   npm install
   ```
5. **Run the Application**:
   ```bash
   npm start
   ```


# Code Structure
- `index.js`: Main application file that interacts with the OpenAI API and demonstrates function calling.
- `functions.js`: Contains functions instructions and metadata that the LLM can call, some of which contain intentional bugs.
- `tools.js`: Includes the actual functions for the LLM to call, with some errors for debugging practice.
- `package.json`: Contains project metadata and dependencies.
- `README.md`: This file, providing an overview and setup instructions.
- `.env`: Environment variables file to store your OpenAI API key. You need to create this file based on the `.env.example` provided. DO NOT commit your actual `.env` file to version control.
- `.env.example`: Example environment variables file.
- `.gitignore`: Specifies files and directories to be ignored by Git.
- `prompts.md`: Contains prompts used to generate the code and explanations.

