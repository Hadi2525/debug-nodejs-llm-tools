# tools.py
# A tool registry + helpers to expose specs in the shape each provider expects.

from typing import Dict, Any, Callable, List

TOOL_REGISTRY: Dict[str, Dict[str, Any]] = {}


def register_tool(spec: Dict[str, Any], handler: Callable) -> None:
    """Register a tool/function with its specification and handler for LLM function calling.
    
    This function adds a tool to the global TOOL_REGISTRY, making it available for both
    OpenAI and Gemini function calling. Each tool requires a unique name, description,
    and parameter schema following JSON Schema format.
    
    Args:
        spec: Tool specification dictionary containing:
            - name (str, required): Unique identifier for the tool (e.g., "get_weather", "send_email").
              Use snake_case without spaces or special characters.
            - description (str, required): Clear explanation of what the tool does and when to use it.
              Be specific as LLMs use this to decide which tool to call.
            - parameters (dict, required): JSON Schema object defining the tool's input parameters.
              Must include 'type', 'properties', and optionally 'required' array.
        handler: Async callable function that executes the tool's logic. Should accept a dictionary
            of arguments and return the result (typically a dict or list).
    
    Raises:
        ValueError: If the spec is missing a 'name' field.
    
    Example:
        >>> def my_handler(args):
        ...     return {"result": args["input"] * 2}
        >>> 
        >>> register_tool(
        ...     {
        ...         "name": "double_number",
        ...         "description": "Multiplies a number by 2",
        ...         "parameters": {
        ...             "type": "object",
        ...             "properties": {
        ...                 "input": {"type": "number", "description": "Number to double"}
        ...             },
        ...             "required": ["input"]
        ...         }
        ...     },
        ...     my_handler
        ... )
    
    Note:
        - Tools are stored globally and persist for the application lifetime
        - Each tool name must be unique; registering a duplicate name will overwrite the previous one
        - Both OpenAI and Gemini can use registered tools automatically
    """
    name = spec.get("name")
    if not name:
        raise ValueError("Tool must have a name")
    
    TOOL_REGISTRY[name] = {
        "name": name,
        "description": spec.get("description", ""),
        "parameters": spec.get("parameters", {}),
        "handler": handler,
    }


async def dispatch(tool_name: str, args: Dict[str, Any]) -> Any:
    """Execute a registered tool by name with the provided arguments.
    
    This function looks up a tool in the registry and invokes its handler with the given arguments.
    It provides error handling to catch and return any exceptions that occur during tool execution.
    This is the central dispatcher used when LLMs request function calls.
    
    Args:
        tool_name: The unique name of the tool to execute (must match a registered tool name)
        args: Dictionary of arguments to pass to the tool's handler function. The keys and values
            should match the tool's parameter schema.
    
    Returns:
        The result returned by the tool's handler function (typically a dict or list).
        Returns {"error": "error message"} if the tool is not found or execution fails.
    
    Example:
        >>> await dispatch("get_time", {})
        {'now': '2025-11-28T14:30:45.123456Z'}
        
        >>> await dispatch("convert_units", {"kind": "c_to_f", "value": 25})
        {'input': 25, 'output': 77.0, 'unit': 'F'}
        
        >>> await dispatch("nonexistent_tool", {})
        {'error': 'Unknown tool: nonexistent_tool'}
    
    Note:
        - This is an async function and must be awaited
        - All tool handlers are called as async functions
        - Errors are caught and returned as error dictionaries rather than raising exceptions
        - Used internally by the server when processing LLM function call requests
    """
    spec = TOOL_REGISTRY.get(tool_name)
    if not spec:
        return {"error": f"Unknown tool: {tool_name}"}
    
    try:
        handler = spec["handler"]
        return await handler(args)
    except Exception as err:
        return {"error": str(err)}


def list_tools_for_openai() -> List[Dict[str, Any]]:
    """Format all registered tools for OpenAI's Chat Completions API function calling.
    
    This function converts the tool registry into the specific format required by OpenAI's
    function calling feature. Each tool is wrapped in a structure with 'type': 'function'
    and includes the complete JSON Schema for parameters.
    
    Returns:
        List of dictionaries in OpenAI's required format:
        [
            {
                "type": "function",
                "function": {
                    "name": "tool_name",
                    "description": "tool description",
                    "parameters": {...}  # JSON Schema
                }
            },
            ...
        ]
    
    Example:
        >>> tools = list_tools_for_openai()
        >>> client.chat.completions.create(
        ...     model="gpt-4o",
        ...     messages=[{"role": "user", "content": "What time is it?"}],
        ...     tools=tools,
        ...     tool_choice="auto"
        ... )
    
    Note:
        - Returns all tools currently registered in TOOL_REGISTRY
        - Format follows OpenAI's function calling specification
        - Includes 'additionalProperties' field which OpenAI accepts
        - Used by the /query endpoint for OpenAI function calling
    """
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["parameters"],
            },
        }
        for t in TOOL_REGISTRY.values()
    ]


def list_tools_for_gemini() -> List[Dict[str, Any]]:
    """Format all registered tools for Google Gemini's function calling API.
    
    This function converts the tool registry into the specific format required by Gemini's
    function calling feature. It returns a flat list of function declarations and automatically
    removes the 'additionalProperties' field from JSON Schema parameters, as Gemini's API
    validation rejects this field.
    
    Returns:
        List of function declaration dictionaries in Gemini's required format:
        [
            {
                "name": "tool_name",
                "description": "tool description",
                "parameters": {...}  # JSON Schema without 'additionalProperties'
            },
            ...
        ]
    
    Example:
        >>> function_declarations = list_tools_for_gemini()
        >>> tools = types.Tool(function_declarations=function_declarations)
        >>> config = types.GenerateContentConfig(tools=[tools])
        >>> client.models.generate_content(
        ...     model="gemini-2.5-flash",
        ...     contents="What's the weather?",
        ...     config=config
        ... )
    
    Note:
        - Returns all tools currently registered in TOOL_REGISTRY
        - Automatically strips 'additionalProperties' from parameter schemas for Gemini compatibility
        - Format follows Google's function calling specification for the new google-genai library
        - Used by the /query-gemini endpoint for Gemini function calling
        - The caller must wrap this in types.Tool(function_declarations=...)
    """
    tools = []
    for t in TOOL_REGISTRY.values():
        # Remove additionalProperties from parameters as Gemini doesn't accept it
        params = t["parameters"].copy()
        if "additionalProperties" in params:
            params = {k: v for k, v in params.items() if k != "additionalProperties"}
        
        tools.append({
            "name": t["name"],
            "description": t["description"],
            "parameters": params,
        })
    return tools
