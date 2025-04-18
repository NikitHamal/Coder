const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ... existing code ...

// Helper function to generate random IDs (potentially used by Qwen endpoints too, keeping for now)
function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// API endpoint to create a new Qwen chat
app.post('/api/qwen/new-chat', async (req, res) => {
  try {
    const { message, isWebSearchEnabled = true, isThinkingEnabled = true, mode = 'ask', workspaceContext = null } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate message ID - use the same ID throughout the request
    const messageId = generateId();
    
    // --- Context Gathering and Prompt Modification (Write Mode - Placeholder) ---
    let finalMessage = message;
    if (mode === 'write') {
        console.log('Write mode activated for new chat. Gathering context...');
        // Use the context passed from the frontend, or a default if none provided
        const context = workspaceContext || "/* No context provided by client */"; 

        // Prepend context and instructions to the message
        const writeInstructions = `You are in \'write\' mode. Analyze the request and the provided context (formatted with Markdown headers: ## File List, ## Active File Path, ## Active File Symbols, ## Active File Content).\nContext:\n---\n${context}\n---\nRespond ONLY with a JSON object containing an \'actions\' array (objects with \'type\', \'path\', \'content\') and an \'explanation\' string. Example: { \"actions\": [{ \"type\": \"create_file\", \"path\": \"new.js\", \"content\": \"console.log(\'hello\');\" }], \"explanation\": \"Created new.js.\" }`;
        finalMessage = `${writeInstructions}\n\nUser request: ${message}`;
        console.log('Modified prompt for write mode using provided context.');
    }
    // --- End Placeholder ---
    
    // Use a single message object definition to avoid inconsistencies
    const messageObject = {
      id: messageId,
      parentId: null,
      childrenIds: [],
      role: "user",
      content: finalMessage,
      timestamp: Math.floor(Date.now() / 1000),
      models: ["qwen-max-latest"], // Using qwen-max-latest as requested
      chat_type: isWebSearchEnabled ? "search" : "t2t",
      feature_config: {
        thinking_enabled: isThinkingEnabled
      }
    };

    const requestBody = {
      chat: {
        id: "",
        title: "New Chat",
        models: ["qwen-max-latest"], // Using qwen-max-latest
        params: {},
        history: {
          messages: {
            // Use the messageObject directly
            [messageId]: messageObject
          },
          currentId: messageId,
          currentResponseIds: [messageId]
        },
        messages: [
          // Use the same messageObject to ensure consistency
          messageObject
        ],
        tags: [],
        timestamp: Date.now(),
        chat_type: isWebSearchEnabled ? "search" : "t2t"
      }
    };

    // Set up the request to Qwen API
    const response = await axios({
      method: 'POST',
      url: 'https://chat.qwen.ai/api/v1/chats/new',
      headers: { // Keeping existing headers, assuming they are correct for the scrapped API
        'accept': 'application/json',
        'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8',
        'authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTczOTMyMH0.yfMRiaiaBCRzSzw-GdpoNBjzVhMMsq6RMJVx7FLhfRw`, // Note: This token might expire or need to be dynamic
        'bx-ua': `231!VFG3kAmUHPS+joLEpk3BrqkjUq/YvqY2leOxacSC80vTPuB9lMZY9mRWFzrwLEf8CMxBx5Zj/IMKgVL+wXxkGw4YLXhhe2Kox49TYvfQIlvBx0gs8Vzu80lpm+GaYeSRDqOr6cg4fXC/a0XUceQ0xJDzLuHRW1TTPKxPv4yQNHqlkBJS+b7Y1Uy5XJvsEbFxAMsrDXbMyBTI4f3uVlNhGiD+Aw8e+Zd++6WF1cGA3VR7HJBh+++j+ygU3+jOQGGIRxebFkk3+gAg0XSGaJwkPXOvOsy4Bg9jC0dGbib7vjST2gTTVby/I2fV7V+daURjcVHIaLCOMh3Q01Mes8nR2gpzWtB1C1yZLOU+YVB0uGHEbd0nJ/Tq1WQMPpx0Sk3kcTWPZXO2cPmQaP/5WBEA/wvdIbi0NFvA9erxMBqxL1wWBdg786kAj9QT8knaH8oK+v+lRHeaURVVsqi203nh9pnf+a1BrAfTkn/aGqzkSm/RFAsAqj68hBj121+juT4M/W8FM2Hhc2ZmuwV5d30EL2HBMFH0JA8sJorCHRFoWP44vesxWDCRebHo2MsOgrAmd7VP5ckAa7mQoHrAp37qVEJW0GAU+Hwrq8y9lZRr4i6Fiv44Sdx7aYSCzUKojMulzb2XQF48SDYCVRQb4NSnTtgktuTLKI3R2YQmtLbgt8IjvpVeLnUZ762d7ORo/74fB0S/G70cPi740LZFQSAGFhqzcjCcvtE+9AyDxfg6KHzKqzcsk8xtmLAGCPtgfb4g6oc9pTYwpYQEmd+z4SXpUQyVIMyheQS/4TgzhkOC+zbR8EvKMEG8936AT3K1gxd+Mq/WlHbqWB2RMA7iiXUwWd1kv+MHHltqgoPRkMOYwSm6BBWu+LDzmq1kLCn5CSkjvsoDQwiCYysbsumEtfJZxTiLi/7zlV3nBausLxo6WqF+knfbo0YFgqv3nVJwaRhcU4MkbEKbCC7eJgCcfaSROWKRZOwYyh9XyOOLtfse+vnxnqh1bS/OCMI5zAKZtEaKwUm3QhIYOGu1Lnc6r3Lj9MiATgOJjyFjkOl0Kjkw4QXuOPshmGpgocXPv6tM87pECxl40D6Gkitt2CgEzq9+4TVQ/vaDXu1G4gi8jIkq/9D1SEcO654B64mYZlzR8EVf/efXZfsPWUgu2r1ADaNTv13i73J0p2i9cVzGJ1PQ6T/f89R74LbWbfPT6E4Rm0jlw2d2YEplOzlhCyWYOuEv/JiqOJAMuOs1jjleNhtUyyq/z6Lm9FwGuqTjsJSyKB7PRp88Vb8M3ULNd/q3QorYDvyVVhBkK3MgR4vqPVwVQnYwpwvzpnTMrUNLAZ1n8Sfz/faKMltCEwTLu0MrRNOK8zXonhV196ac0wgkZao95BSWwWFPgvwhHZDs469q01tIUWf/+IjTYCTKhJmvKbGq7jr00A/UBWvr7gPh2aPK8POm3VUCOQrZqCRkXet6YahZ+RFAEG5CpfthEX0DHZsRcmk64UytXXVTcAUruOm86pvGwRwpWbM0Cpnq0+91W4NHo+3G8oDvGqTW+M5AThbG`,
        'bx-umidtoken': 'T2gAJ9PpsQ1ZZHcNVZ8Ho-DBOPvVonZHzqMl-5BP1pApOCqKXoW0I1qalmHuG4MWFR4=',
        'bx-v': '2.5.28',
        'content-type': 'application/json',
        'origin': 'https://chat.qwen.ai',
        'referer': 'https://chat.qwen.ai/',
        'source': 'web',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Cookie': `cna=ipFMIJBNS08CAWew0ni1ZrV2; _gcl_au=1.1.692043161.1741005706.281295935.1741005710.1741005709; _bl_uid=vUmd18I3sXagpawbeqaLnd8yFkaw; acw_tc=37a57088488fff5da412687d1481155b4cc92b30a4b3431960affd41a95f277b; x-ap=ap-southeast-1; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTg3MDc0OH0.fx9UsLfwoto2HSGK2CvBsbXzDfZPND0voYlliGoTpVg; SERVERID=6d5f041642c408b1e7f7a3de4ab2b194|1743278750|1743278746; ssxmod_itna=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeqieqkFD8n+5gD0yGPwtx0=7Df40WwGPobICkQm2xepZzQYH4iOizK=x4diUrYbnA57trSQ8c=40aDbuoz3keD44DvDBYD74G+DDeDixGmC4DStxD9DGP5ElbQheDEDYP5w4DmDGY5reDgIDDBDD=VU7pYuDDlRdN49G0Y3=aV8ZmdfQ+W57D5x0UaDBLPGtq5h=SEuGuWTzgrr4rDzdCDtquTSnEdIobNuCnrbGDmmse6QLYp+7DizGGQ+0KYirz0qDhXDreYb4+0xb0DRGxwitj5Pc4DG8ekGQdWdeii+LCvd1LkeeOoRopuOel7D3Cxo0QmOGSBwZB5kA5tGGNiGKGxo0z4D; ssxmod_itna2=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeqieqkFD8n+5wDDcAikt48TeDLe20+AQsDGN7bgt=29xrp=129ewoWtl7nqnp=u72rYmaQQ2=ufF/4MApyWGjp4FoHeODRDkPn7Nj2WrjcKx8D8c6aeFxu4bP2mgO07rl0W9rIQfP2K2=51IovHdnfGmxfLzrpIwPoNlIv7e0AH0Q8I9+OLRoK6ygLXDtfebIa4QM0W6/FWqmD1h8csvzFy78KQLF1zr3YLvcUXANDYmUzmY+fWAEi7RElOmRDj4Um2AU98RTZnr4=pyFv8+Y7YufiHehBWU+FbHWfHpicqEb4wWYrPI+Rzeej7w0Ieu+R4QGLAw1S+zzD7fu7fHI30CFqziwxzDhRw=NK27AQiWABF0FHH/n4Kxrs0DRxuSxQ=0nDhaXw7l9A+gxsu17FKnqxmwxR0mB9Dbd3HkWbi4zd9j4WluKYeCkD3TW1d0OMFCySAGR94MhoMGo0YbdN/x7ZFC9GQsqZ+uDFlDCO4lQhBD7zTIRi4DrKfQ7B0kZI1CkIswQ1=7uijUkpy0YUFmV=mcxxBhN4bNC0Xu0bFzKeD; tfstk=gOysMngwCFYsrG83jNIEAwcm2cDblr6rfniYqopwDAHtlna42jnwQGVbOrzsWrZcjm3Ykrg4_6WzjlDmHakfUTrg7fJh8PGt6kIx40YOYfBA65sIHa7PLOfBsJkY7zlmpwZK-mivMxUxpBnjJcLxkr3K90nyWxHYkMgKb089WxnvvHnjJqHxkxIQv2mjNWLIx1gUfG3clhMfFgqsRKpYdDsipl9MhDysfH07v265FJ9o14EtRKQlB15ol22R86Z3k5UZxr65RYFuR-G-hOTofWESpVkRNBM_YP2SB8_6QDlj5WetOnpYfvVtZSa15C0T_yGovXKfEDzrJl2TOiYLXzusBDhFegZKMWyiZR7pCYFubAPYywRZW7iA4RJrP_fBGHGkhDgPAMODisAOPKMVY74K6DmEUMsBaIctxDgPAMODifnnxQSCAQRc.; isg=BHJyoT1UQWWK2H10zzUgQuCBw7hUA3adI-DyJjxLeCUQzxbJDJOorzlpvnPznu41` // Note: This cookie might need to be dynamic
      },
      data: requestBody
    });

    // Return the response data, particularly the chat ID
    res.json({
      success: true,
      chatId: response.data.id,
      data: response.data
    });
  } catch (error) {
    console.error('Error creating new Qwen chat:', error);
    
    res.status(500).json({
      error: 'Failed to create new Qwen chat',
      details: error.message // Provide specific error details
    });
  }
});

// API endpoint to stream Qwen chat completions
app.post('/api/qwen/chat-completions', async (req, res) => {
  try {
    const { message, chatId, previousMessages, isWebSearchEnabled = true, isThinkingEnabled = true, mode = 'ask', workspaceContext = null } = req.body;
    
    if (!message || !chatId) {
      return res.status(400).json({ error: 'Message and chatId are required' });
    }

    // --- Context Gathering and Prompt Modification (Write Mode - Placeholder) ---
    let finalMessage = message;
    if (mode === 'write') {
        console.log('Write mode activated for completion. Gathering context...');
        // Use the context passed from the frontend, or a default if none provided
        const context = workspaceContext || "/* No context provided by client */";

        // Prepend context and instructions to the message
        const writeInstructions = `You are in \'write\' mode. Analyze the request and the provided context (formatted with Markdown headers: ## File List, ## Active File Path, ## Active File Symbols, ## Active File Content).\nContext:\n---\n${context}\n---\nRespond ONLY with a JSON object containing an \'actions\' array (objects with \'type\', \'path\', \'content\') and an \'explanation\' string. Example: { \"actions\": [{ \"type\": \"create_file\", \"path\": \"new.js\", \"content\": \"console.log(\'hello\');\" }], \"explanation\": \"Created new.js.\" }`;
        finalMessage = `${writeInstructions}\n\nUser request: ${message}`;
        console.log('Modified prompt for write mode using provided context.');
    }
    // --- End Placeholder ---

    // Create a unique message ID for this request
    const messageId = generateId();
    
    // Create the current message object
    const currentMessage = {
      role: "user",
      content: finalMessage,
      chat_type: isWebSearchEnabled ? "search" : "t2t",
      extra: {},
      feature_config: {
        thinking_enabled: isThinkingEnabled
      }
    };
    
    // Prepare the messages array with previous messages
    let messages = Array.isArray(previousMessages) ? [...previousMessages] : [];
    
    // Add the current message only once
    messages.push(currentMessage);

    // Prepare the request body
    const requestBody = {
      stream: true,
      incremental_output: true,
      chat_type: isWebSearchEnabled ? "search" : "t2t",
      model: "qwen-max-latest", // Using qwen-max-latest
      messages: messages,
      session_id: generateId(), // Consider if session ID needs persistence
      chat_id: chatId,
      id: messageId,
      mode: mode
    };

    console.log(`Proxying completion request for chat ${chatId}, mode: ${mode}`); // Log mode

    // Set up the request to Qwen API
    const response = await axios({
      method: 'POST',
      url: 'https://chat.qwen.ai/api/chat/completions',
      headers: { // Keeping existing headers, assuming they are correct
        'accept': '*/*',
        'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8',
        'authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTczOTMyMH0.yfMRiaiaBCRzSzw-GdpoNBjzVhMMsq6RMJVx7FLhfRw`, // Note: This token might expire
        'bx-ua': `231!jCR3E4mUFO0+joZE2k3ioqBjUq/YvqY2leOxacSC80vTPuB9lMZY9mRWFzrwLEkVa1wFtLD+zQFbYWLEeZ+PqDypteVD4bcidv49os7ftup05rj0SjHecye37e4PpwO6MnJdLQlIUZqghtglF1Pk9VPTDOYkTELeOjtHC1b4QbDgjIT2rwWoxBpnMzJupRkQFj/RDgfR+7RqV8vUykLUurKhBODr+/mep4Dqk+I9xGdF/jDtjFlCok+++4mWYi++6bFcjORDvxBDj+MGMsMUJwZlv7NubwFnKU+BL2MSFovlJ5Z/ko+zvAR6FozG2vCVD+nK4261iJY1SPEADJS7bhX/ENQiTySW83ELsBT0ME58fMyLtuSnnVaTVKuQTkxi7YTBJhT9oH8/kAwe3+pC0aKL3FXYTOh9ZuvdG8x1/ejE2JE2RpBAWvqTMqQDE2Uirm+iu+zzRM2/B0f6pawWdizydz1uhTcZPZ3EDproeB0LmXaG1NxATql60COrHy/PTUkjkoJY8UQGenY+KbfiCz/dKKqTTio05BJuDmAR//pXss0whbZDeKxhyCbMSPFGwlaUWlHLPJRzIyOW/4CJyLJbb4IMf3lncpwxr+zsdGZaFwgPy2ojAKNU1fBk5XdLyGQArHmMY94mcLcYFFtIQgZk9837A26TEo2NNLumqnot43QR3H10y0dOik0hmUn7wgZ+x6sRYMss8JdikVuyHj50QB5xrnqwwE97f/UBGHS9cuoo6I+lGt5pqBozfRG8O4p+9y5rubhUTG6IAGGMs9Y7lx/VmnFjVTvEJct+gjHbojmlOLRFPb64Zm7UE9+qR9weRFkFnd3WFK34HqKUdS2AHXJzVPQdbYbBknaS250cnqb6Ty7aIMyhovVBiJdYv0D9nPgjc6MBbRKP4FywHiscHoPJPvWEW9brSnyw+1iNWMrPBFnDeRUUiOb1qYk7PJ8k+5+XtxDXbylaqPPtG9RsoELYeodI5W8owtrndu0RJJTlzcsBbGWnhkT33klsbX0gZecfdVhsWZPbo7CaE8FX7pPmk9bvohuF+JjvnxBeU1csTVPy+s8cb2TSqQC/ym0k5oK9mtTXos1Icge1HuG42OcbABqSkblkl0RpCTK2AwS8xfIo8XSZNsvO77BjC9M3x4jiFFgFNMceQdP50ATR3bg0ZXvaHA1+iUVhXPnNnDT+aRzTZBwv/P362NBCORKIStp9x7llZrQx6Y2UyxZo56DalxijvFsXEIzJSdGIa21soaoe+MpCxtG57Ccv56/H+9qnHH+h+iQXNkDrp0lQLmplSsVbp7LHGvIm4EERZ3Y8yv7d2jAEVNRYucEQ/Cve13wtt/NWm3zp3Cx7UXwmIs9NfCzpGKfg2Pvisg2OsmudEw8ctz/TOqk51wmY2oUEo8mPPlG/vrJpjczae1CUU4IgVsucd2nzeTfM3CricBdbvWUXs+RN7ILPy92HbtwaLf8L+WxgIXCJMI+7P4UUlPcwqSP2S1L0TIN+zFcsVBYo5h0K/R44PPPZPi5ripHWDArE0RgX5ipeL+1YVuBlD0Pw0nLmJ1FY7Z3xOAD/2npdm62f0aRKaxyJ`,
        'bx-umidtoken': 'T2gAJ9PpsQ1ZZHcNVZ8Ho-DBOPvVonZHzqMl-5BP1pApOCqKXoW0I1qalmHuG4MWFR4=',
        'bx-v': '2.5.28',
        'content-type': 'application/json',
        'origin': 'https://chat.qwen.ai',
        'referer': `https://chat.qwen.ai/c/${chatId}`, // Referer needs the chat ID
        'source': 'web',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'x-accel-buffering': 'no', // Important for streaming
        'Cookie': `cna=ipFMIJBNS08CAWew0ni1ZrV2; _gcl_au=1.1.692043161.1741005706.281295935.1741005710.1741005709; _bl_uid=vUmd18I3sXagpawbeqaLnd8yFkaw; x-ap=ap-southeast-1; acw_tc=218e65551f0ca9d4d6df9ffb7b4b9a287784a6fe2295fab2299e327ca382409e; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTg3MjYyOH0.JZiJUEeAOIISv_6ZYTlJrm6cLxg1eR5bRi_XtwM7Wd0; SERVERID=6d5f041642c408b1e7f7a3de4ab2b194|1743280629|1743278746; ssxmod_itna=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeiUm=Nz77WmPgD0yGwvDBKQDax7fr0+eoTU=KRBD+ReKzQYHXQYZ1KWeqYyjOxRuv5ndxSQOo4B3DEcmvRKxGGD0oDt4DIDAYDDxDWDYEIDGUTDG=D7E2o6lR5xi3DbErADDoDYf2qxiUoDDtDiLXdFxRQDDXlRwG=KQ4br6NFNg43wDcxKArDjkPD/8hvuA2HhFSQ9eamaFWmteGyD5GuUletkS+OGjTQP1meYDEB5oLzKoUx+7DizGGQ+0KYD/e4YSc8Dxl+0xb0DR0qFTtfveu4DG8e3DwwGYeYihwCIq1fkeoCoRgmuEY=Q4G7xoA5moxg75IOqKOqG7qelx4nDQiIOiDD; ssxmod_itna2=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeiUm=Nz77WmPwDDcA=oKQRDA=DFoRwxbOtDDs0KD8hnUzpI0046r4q+3x6O4schM0Nmb7djn0Dk7kc0oWyDCehF/eI4WphhTca1rWBWq0qOqGvxb=DimcwxCEq7kDKms9eaoicKC628FbcOgZYksUKfKa3aX/O89F7HAzc61rDGERa4XpyjtIoa/tD7xqk199KQe5jv3ydH7+oE0nSkr7ZDbII0L=fXDLBCAVDYCcSWmuP2Lr0um1Sf0opxR0qUvzic1BR4FuBbGVW9KG+Fbixo96nxCKHhKe+C9blbKR2kiF19iKY9KlAFCpY2boamlnBqiPoX4xFikCaQOga8beKrKlreFmp3wkK83=8oy4eWaKnhTYR5V74R2tSxhFDL9GNySWv8KeD; tfstk=gLGSVCZPNgj5__smr3L4lnmUONVIRDON2waKS2CPJ7F8AwiEWJUPaUDIhDo72bP82ZUIjP_-TJ38AoUtf8CdeJUIGzosL6389JwQ5cULyHvuMrUgwJDzYurQO2m6uhRw_40utSKwbC7bLw_0_aUdYy3YMWzBgSjPa40utZxoJFuorMsoFIu89DFYHPz79yUdeENY7PNdwJCRHiE0JWFLe63AkyUgvTB-vqLbSoEL98hVRiaDFouWykYYDsOTn4Ef96hWE-Z1voU0ljTLelu8p6Cp-zw7X4EXjDS2S-33dXbhOR3-ID4t2gKQxjgxwAn90Tr-CygZd4dRM7loyAeK6HXKf7iQBbefJ13oyuPbkfLFIolb4Dh7HF5_LShaB7H2n3yUNPiKZ0_C9c3q7b2mOhsYxYzgMyGHW9ZQpg7N_l9Mh9_bI6abbETfK9vheh1QTEkiD8U0u58XlOW3er4bbETfK928orXwlE6NK; isg=BEFBtwDiwngWaS5hsMhDr7eEUI1bbrVgVAXBk6OWpMimimNc776ZMjbMbebM202Y` // Note: This cookie might need to be dynamic
      },
      data: requestBody,
      responseType: 'stream',
      maxRedirects: 5,
      timeout: 60000 // Increased timeout for potentially longer streams
    });

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Process the streaming response
    response.data.on('data', (chunk) => {
      try {
        const dataStr = chunk.toString();
        
        // Forward the data as-is in the correct SSE format
        // Qwen stream data seems to be already formatted for SSE
        if (dataStr.trim()) {
          res.write(dataStr); // Send raw chunk
          // Add double newline after each chunk to conform to SSE standard
          res.write('\n\n'); 
        }
      } catch (err) {
        console.error('Error processing Qwen stream chunk:', err);
      }
    });

    // Handle end of stream
    response.data.on('end', () => {
       // Send a final confirmation event if needed, or just end
      res.write('data: [DONE]\n\n'); 
      res.end();
    });

    // Handle errors and client disconnect
    response.data.on('error', (err) => {
      console.error('Stream error from Qwen:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error', details: err.message });
      } else {
        // Try to write an error event before closing if possible
        try {
           res.write(`event: error\ndata: ${JSON.stringify({ message: 'Stream error occurred' })}\n\n`);
        } catch (writeError) {
            console.error("Could not write error event to client:", writeError);
        }
        res.end();
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      console.log('Client disconnected, destroying Qwen stream');
      response.data.destroy();
    });
  } catch (error) {
    console.error('Error proxying request to Qwen chat completions:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to get response from Qwen chat completions',
        details: error.message // Provide specific error details
      });
    } else {
        res.end(); // End the response if headers were already sent
    }
  }
});

// --- NEW ENDPOINT FOR GRAPHIC GENERATION ---
app.post('/generate-graphic', async (req, res) => {
  try {
    // Get the structured prompt and dimensions from the frontend request
    const { prompt: structuredPrompt, width, height } = req.body;

    if (!structuredPrompt || !width || !height) {
      return res.status(400).json({ error: 'Prompt, width, and height are required' });
    }

    console.log(`Received request for /generate-graphic: ${width}x${height}`);

    // --- Prepare request for Qwen Completions API (NON-STREAMING) ---
    // Note: This reuses headers/auth from the streaming endpoint. Ensure these are still valid.
    // You might need a persistent chat session or adapt the API call based on Qwen's requirements
    // for non-streaming structured data generation.
    const messageId = generateId(); // Generate a unique ID for this message
    const chatId = generateId(); // Generate a dummy chat ID for this request (or manage sessions if needed)

    const requestBody = {
      stream: false, // Make sure this is false for a single response
      incremental_output: false,
      chat_type: "t2t", // Use 't2t' as we expect direct text/JSON output, not search results
      model: "qwen-max-latest",
      messages: [
        {
          role: "user",
          content: structuredPrompt, // Send the detailed prompt requesting JSON
          chat_type: "t2t",
          extra: {},
          feature_config: {
            thinking_enabled: false // Disable thinking for faster, direct response if possible
          }
        }
      ],
      session_id: generateId(), // Dummy session ID
      chat_id: chatId,
      id: messageId,
      mode: "ask" // Use 'ask' mode for direct generation
    };

    console.log("Sending non-streaming request to Qwen completions API...");

    // --- Call Qwen API ---
    const response = await axios({
      method: 'POST',
      url: 'https://chat.qwen.ai/api/chat/completions', // Same endpoint, but non-streaming
      headers: { // Reusing headers from the streaming endpoint - **Ensure these are valid and appropriate**
        'accept': 'application/json', // Expecting JSON back primarily
        'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8',
        'authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTczOTMyMH0.yfMRiaiaBCRzSzw-GdpoNBjzVhMMsq6RMJVx7FLhfRw`, // CRITICAL: Use valid token
        'bx-ua': `231!jCR3E4mUFO0+joZE2k3ioqBjUq/YvqY2leOxacSC80vTPuB9lMZY9mRWFzrwLEkVa1wFtLD+zQFbYWLEeZ+PqDypteVD4bcidv49os7ftup05rj0SjHecye37e4PpwO6MnJdLQlIUZqghtglF1Pk9VPTDOYkTELeOjtHC1b4QbDgjIT2rwWoxBpnMzJupRkQFj/RDgfR+7RqV8vUykLUurKhBODr+/mep4Dqk+I9xGdF/jDtjFlCok+++4mWYi++6bFcjORDvxBDj+MGMsMUJwZlv7NubwFnKU+BL2MSFovlJ5Z/ko+zvAR6FozG2vCVD+nK4261iJY1SPEADJS7bhX/ENQiTySW83ELsBT0ME58fMyLtuSnnVaTVKuQTkxi7YTBJhT9oH8/kAwe3+pC0aKL3FXYTOh9ZuvdG8x1/ejE2JE2RpBAWvqTMqQDE2Uirm+iu+zzRM2/B0f6pawWdizydz1uhTcZPZ3EDproeB0LmXaG1NxATql60COrHy/PTUkjkoJY8UQGenY+KbfiCz/dKKqTTio05BJuDmAR//pXss0whbZDeKxhyCbMSPFGwlaUWlHLPJRzIyOW/4CJyLJbb4IMf3lncpwxr+zsdGZaFwgPy2ojAKNU1fBk5XdLyGQArHmMY94mcLcYFFtIQgZk9837A26TEo2NNLumqnot43QR3H10y0dOik0hmUn7wgZ+x6sRYMss8JdikVuyHj50QB5xrnqwwE97f/UBGHS9cuoo6I+lGt5pqBozfRG8O4p+9y5rubhUTG6IAGGMs9Y7lx/VmnFjVTvEJct+gjHbojmlOLRFPb64Zm7UE9+qR9weRFkFnd3WFK34HqKUdS2AHXJzVPQdbYbBknaS250cnqb6Ty7aIMyhovVBiJdYv0D9nPgjc6MBbRKP4FywHiscHoPJPvWEW9brSnyw+1iNWMrPBFnDeRUUiOb1qYk7PJ8k+5+XtxDXbylaqPPtG9RsoELYeodI5W8owtrndu0RJJTlzcsBbGWnhkT33klsbX0gZecfdVhsWZPbo7CaE8FX7pPmk9bvohuF+JjvnxBeU1csTVPy+s8cb2TSqQC/ym0k5oK9mtTXos1Icge1HuG42OcbABqSkblkl0RpCTK2AwS8xfIo8XSZNsvO77BjC9M3x4jiFFgFNMceQdP50ATR3bg0ZXvaHA1+iUVhXPnNnDT+aRzTZBwv/P362NBCORKIStp9x7llZrQx6Y2UyxZo56DalxijvFsXEIzJSdGIa21soaoe+MpCxtG57Ccv56/H+9qnHH+h+iQXNkDrp0lQLmplSsVbp7LHGvIm4EERZ3Y8yv7d2jAEVNRYucEQ/Cve13wtt/NWm3zp3Cx7UXwmIs9NfCzpGKfg2Pvisg2OsmudEw8ctz/TOqk51wmY2oUEo8mPPlG/vrJpjczae1CUU4IgVsucd2nzeTfM3CricBdbvWUXs+RN7ILPy92HbtwaLf8L+WxgIXCJMI+7P4UUlPcwqSP2S1L0TIN+zFcsVBYo5h0K/R44PPPZPi5ripHWDArE0RgX5ipeL+1YVuBlD0Pw0nLmJ1FY7Z3xOAD/2npdm62f0aRKaxyJ`,
        'bx-umidtoken': 'T2gAJ9PpsQ1ZZHcNVZ8Ho-DBOPvVonZHzqMl-5BP1pApOCqKXoW0I1qalmHuG4MWFR4=',
        'bx-v': '2.5.28',
        'content-type': 'application/json',
        'origin': 'https://chat.qwen.ai',
        'referer': `https://chat.qwen.ai/c/${chatId}`, // Referer might need a valid or dummy chat ID
        'source': 'web',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Cookie': `cna=ipFMIJBNS08CAWew0ni1ZrV2; _gcl_au=1.1.692043161.1741005706.281295935.1741005710.1741005709; _bl_uid=vUmd18I3sXagpawbeqaLnd8yFkaw; x-ap=ap-southeast-1; acw_tc=218e65551f0ca9d4d6df9ffb7b4b9a287784a6fe2295fab2299e327ca382409e; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTg3MjYyOH0.JZiJUEeAOIISv_6ZYTlJrm6cLxg1eR5bRi_XtwM7Wd0; SERVERID=6d5f041642c408b1e7f7a3de4ab2b194|1743280629|1743278746; ssxmod_itna=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeiUm=Nz77WmPgD0yGwvDBKQDax7fr0+eoTU=KRBD+ReKzQYHXQYZ1KWeqYyjOxRuv5ndxSQOo4B3DEcmvRKxGGD0oDt4DIDAYDDxDWDYEIDGUTDG=D7E2o6lR5xi3DbErADDoDYf2qxiUoDDtDiLXdFxRQDDXlRwG=KQ4br6NFNg43wDcxKArDjkPD/8hvuA2HhFSQ9eamaFWmteGyD5GuUletkS+OGjTQP1meYDEB5oLzKoUx+7DizGGQ+0KYD/e4YSc8Dxl+0xb0DR0qFTtfveu4DG8e3DwwGYeYihwCIq1fkeoCoRgmuEY=Q4G7xoA5moxg75IOqKOqG7qelx4nDQiIOiDD; ssxmod_itna2=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeiUm=Nz77WmPwDDcA=oKQRDA=DFoRwxbOtDDs0KD8hnUzpI0046r4q+3x6O4schM0Nmb7djn0Dk7kc0oWyDCehF/eI4WphhTca1rWBWq0qOqGvxb=DimcwxCEq7kDKms9eaoicKC628FbcOgZYksUKfKa3aX/O89F7HAzc61rDGERa4XpyjtIoa/tD7xqk199KQe5jv3ydH7+oE0nSkr7ZDbII0L=fXDLBCAVDYCcSWmuP2Lr0um1Sf0opxR0qUvzic1BR4FuBbGVW9KG+Fbixo96nxCKHhKe+C9blbKR2kiF19iKY9KlAFCpY2boamlnBqiPoX4xFikCaQOga8beKrKlreFmp3wkK83=8oy4eWaKnhTYR5V74R2tSxhFDL9GNySWv8KeD; tfstk=gLGSVCZPNgj5__smr3L4lnmUONVIRDON2waKS2CPJ7F8AwiEWJUPaUDIhDo72bP82ZUIjP_-TJ38AoUtf8CdeJUIGzosL6389JwQ5cULyHvuMrUgwJDzYurQO2m6uhRw_40utSKwbC7bLw_0_aUdYy3YMWzBgSjPa40utZxoJFuorMsoFIu89DFYHPz79yUdeENY7PNdwJCRHiE0JWFLe63AkyUgvTB-vqLbSoEL98hVRiaDFouWykYYDsOTn4Ef96hWE-Z1voU0ljTLelu8p6Cp-zw7X4EXjDS2S-33dXbhOR3-ID4t2gKQxjgxwAn90Tr-CygZd4dRM7loyAeK6HXKf7iQBbefJ13oyuPbkfLFIolb4Dh7HF5_LShaB7H2n3yUNPiKZ0_C9c3q7b2mOhsYxYzgMyGHW9ZQpg7N_l9Mh9_bI6abbETfK9vheh1QTEkiD8U0u58XlOW3er4bbETfK928orXwlE6NK; isg=BEFBtwDiwngWaS5hsMhDr7eEUI1bbrVgVAXBk6OWpMimimNc776ZMjbMbebM202Y` // CRITICAL: Use valid cookie
      },
      data: requestBody,
      timeout: 60000 // Timeout for the API call
    });

    console.log("Received response from Qwen API.");

    // --- Parse the Response ---
    // The structure of the non-streaming response needs to be determined.
    // Assuming the main content is in response.data.choices[0].message.content or similar.
    // Adjust based on actual Qwen API response structure.
    let rawContent = '';
    if (response.data && response.data.choices && response.data.choices.length > 0 && response.data.choices[0].message) {
        rawContent = response.data.choices[0].message.content;
    } else if (response.data && response.data.message && response.data.message.content) {
        // Alternative possible structure
        rawContent = response.data.message.content;
    } else {
        // Fallback or inspect response.data if structure is unknown
        console.warn("Unexpected Qwen response structure:", response.data);
        rawContent = JSON.stringify(response.data); // Log the whole thing if unsure
    }


    if (!rawContent) {
        throw new Error("Received empty content from Qwen API.");
    }

    console.log("Raw content from Qwen:", rawContent);

    // --- Extract JSON from the response ---
    // Qwen might wrap the JSON in ```json ... ``` or add other text.
    // We need to extract *only* the valid JSON part.
    let graphicJson = null;
    try {
      // Try direct parsing first
      graphicJson = JSON.parse(rawContent);
    } catch (e) {
      // If direct parsing fails, try extracting from markdown code block
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          graphicJson = JSON.parse(jsonMatch[1]);
          console.log("Extracted JSON from markdown block.");
        } catch (parseError) {
          console.error("Failed to parse JSON even after extracting from markdown:", parseError);
          throw new Error(`Failed to parse JSON response from Qwen. Content: ${rawContent}`);
        }
      } else {
        // If no markdown block found and direct parse failed
         console.error("Failed to parse raw content as JSON and no JSON markdown block found:", e);
         throw new Error(`Received non-JSON response from Qwen. Content: ${rawContent}`);
      }
    }

     // --- Validate Extracted JSON ---
     if (!graphicJson || typeof graphicJson !== 'object' || !graphicJson.canvas || !Array.isArray(graphicJson.elements)) {
        console.error("Parsed JSON does not match expected graphic structure:", graphicJson);
        throw new Error('Received invalid graphic data structure from Qwen.');
    }


    // --- Send successful response back to frontend ---
    console.log("Successfully parsed graphic JSON. Sending to client.");
    res.status(200).json(graphicJson);

  } catch (error) {
    console.error('Error in /generate-graphic endpoint:', error);
    
    // Check if the error is from Axios (network/Qwen API error)
    if (error.response) {
      console.error('Qwen API Error Status:', error.response.status);
      console.error('Qwen API Error Data:', error.response.data);
       res.status(error.response.status || 500).json({
          error: 'Failed to get valid response from Qwen API for graphic generation',
          details: error.response.data || error.message
       });
    } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from Qwen API:', error.request);
        res.status(504).json({ error: 'No response received from Qwen API (Timeout or Network Issue)', details: error.message });
    } else {
      // Other errors (e.g., parsing, logic errors)
      res.status(500).json({
        error: 'Internal server error during graphic generation',
        details: error.message
      });
    }
  }
});

// API endpoint specifically for slide generation
app.post('/api/generate-slides', async (req, res) => {
  try {
    const { prompt, slideCount, slideStyle } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`Received slide generation request: ${slideCount} slides, style: ${slideStyle}`);
    
    // Generate a unique message ID and chat ID
    const messageId = generateId();
    const chatId = generateId();
    
    // Create the message for Qwen - using the prompt directly
    const messages = [
      {
        role: "user",
        content: prompt,
        chat_type: "t2t", // Text to text, no web search for slide generation
        extra: {},
        feature_config: {
          thinking_enabled: true // Enable thinking for better structured responses
        }
      }
    ];

    // Prepare the request body for non-streaming response (better for structured data)
    const requestBody = {
      stream: false,
      incremental_output: false,
      chat_type: "t2t",
      model: "qwen-max-latest",
      messages: messages,
      session_id: messageId,
      chat_id: chatId,
      id: messageId
    };

    console.log("Sending slide generation request to Qwen API");

    // Call Qwen API directly without streaming
    const response = await axios({
      method: 'POST',
      url: 'https://chat.qwen.ai/api/chat/completions',
      headers: {
        'accept': 'application/json',
        'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8',
        'authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTczOTMyMH0.yfMRiaiaBCRzSzw-GdpoNBjzVhMMsq6RMJVx7FLhfRw`,
        'bx-ua': `231!jCR3E4mUFO0+joZE2k3ioqBjUq/YvqY2leOxacSC80vTPuB9lMZY9mRWFzrwLEkVa1wFtLD+zQFbYWLEeZ+PqDypteVD4bcidv49os7ftup05rj0SjHecye37e4PpwO6MnJdLQlIUZqghtglF1Pk9VPTDOYkTELeOjtHC1b4QbDgjIT2rwWoxBpnMzJupRkQFj/RDgfR+7RqV8vUykLUurKhBODr+/mep4Dqk+I9xGdF/jDtjFlCok+++4mWYi++6bFcjORDvxBDj+MGMsMUJwZlv7NubwFnKU+BL2MSFovlJ5Z/ko+zvAR6FozG2vCVD+nK4261iJY1SPEADJS7bhX/ENQiTySW83ELsBT0ME58fMyLtuSnnVaTVKuQTkxi7YTBJhT9oH8/kAwe3+pC0aKL3FXYTOh9ZuvdG8x1/ejE2JE2RpBAWvqTMqQDE2Uirm+iu+zzRM2/B0f6pawWdizydz1uhTcZPZ3EDproeB0LmXaG1NxATql60COrHy/PTUkjkoJY8UQGenY+KbfiCz/dKKqTTio05BJuDmAR//pXss0whbZDeKxhyCbMSPFGwlaUWlHLPJRzIyOW/4CJyLJbb4IMf3lncpwxr+zsdGZaFwgPy2ojAKNU1fBk5XdLyGQArHmMY94mcLcYFFtIQgZk9837A26TEo2NNLumqnot43QR3H10y0dOik0hmUn7wgZ+x6sRYMss8JdikVuyHj50QB5xrnqwwE97f/UBGHS9cuoo6I+lGt5pqBozfRG8O4p+9y5rubhUTG6IAGGMs9Y7lx/VmnFjVTvEJct+gjHbojmlOLRFPb64Zm7UE9+qR9weRFkFnd3WFK34HqKUdS2AHXJzVPQdbYbBknaS250cnqb6Ty7aIMyhovVBiJdYv0D9nPgjc6MBbRKP4FywHiscHoPJPvWEW9brSnyw+1iNWMrPBFnDeRUUiOb1qYk7PJ8k+5+XtxDXbylaqPPtG9RsoELYeodI5W8owtrndu0RJJTlzcsBbGWnhkT33klsbX0gZecfdVhsWZPbo7CaE8FX7pPmk9bvohuF+JjvnxBeU1csTVPy+s8cb2TSqQC/ym0k5oK9mtTXos1Icge1HuG42OcbABqSkblkl0RpCTK2AwS8xfIo8XSZNsvO77BjC9M3x4jiFFgFNMceQdP50ATR3bg0ZXvaHA1+iUVhXPnNnDT+aRzTZBwv/P362NBCORKIStp9x7llZrQx6Y2UyxZo56DalxijvFsXEIzJSdGIa21soaoe+MpCxtG57Ccv56/H+9qnHH+h+iQXNkDrp0lQLmplSsVbp7LHGvIm4EERZ3Y8yv7d2jAEVNRYucEQ/Cve13wtt/NWm3zp3Cx7UXwmIs9NfCzpGKfg2Pvisg2OsmudEw8ctz/TOqk51wmY2oUEo8mPPlG/vrJpjczae1CUU4IgVsucd2nzeTfM3CricBdbvWUXs+RN7ILPy92HbtwaLf8L+WxgIXCJMI+7P4UUlPcwqSP2S1L0TIN+zFcsVBYo5h0K/R44PPPZPi5ripHWDArE0RgX5ipeL+1YVuBlD0Pw0nLmJ1FY7Z3xOAD/2npdm62f0aRKaxyJ`,
        'bx-umidtoken': 'T2gAJ9PpsQ1ZZHcNVZ8Ho-DBOPvVonZHzqMl-5BP1pApOCqKXoW0I1qalmHuG4MWFR4=',
        'bx-v': '2.5.28',
        'content-type': 'application/json',
        'origin': 'https://chat.qwen.ai',
        'referer': `https://chat.qwen.ai/c/${chatId}`,
        'source': 'web',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Cookie': `cna=ipFMIJBNS08CAWew0ni1ZrV2; _gcl_au=1.1.692043161.1741005706.281295935.1741005710.1741005709; _bl_uid=vUmd18I3sXagpawbeqaLnd8yFkaw; x-ap=ap-southeast-1; acw_tc=218e65551f0ca9d4d6df9ffb7b4b9a287784a6fe2295fab2299e327ca382409e; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTg3MjYyOH0.JZiJUEeAOIISv_6ZYTlJrm6cLxg1eR5bRi_XtwM7Wd0; SERVERID=6d5f041642c408b1e7f7a3de4ab2b194|1743280629|1743278746; ssxmod_itna=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeiUm=Nz77WmPgD0yGwvDBKQDax7fr0+eoTU=KRBD+ReKzQYHXQYZ1KWeqYyjOxRuv5ndxSQOo4B3DEcmvRKxGGD0oDt4DIDAYDDxDWDYEIDGUTDG=D7E2o6lR5xi3DbErADDoDYf2qxiUoDDtDiLXdFxRQDDXlRwG=KQ4br6NFNg43wDcxKArDjkPD/8hvuA2HhFSQ9eamaFWmteGyD5GuUletkS+OGjTQP1meYDEB5oLzKoUx+7DizGGQ+0KYD/e4YSc8Dxl+0xb0DR0qFTtfveu4DG8e3DwwGYeYihwCIq1fkeoCoRgmuEY=Q4G7xoA5moxg75IOqKOqG7qelx4nDQiIOiDD; ssxmod_itna2=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeiUm=Nz77WmPwDDcA=oKQRDA=DFoRwxbOtDDs0KD8hnUzpI0046r4q+3x6O4schM0Nmb7djn0Dk7kc0oWyDCehF/eI4WphhTca1rWBWq0qOqGvxb=DimcwxCEq7kDKms9eaoicKC628FbcOgZYksUKfKa3aX/O89F7HAzc61rDGERa4XpyjtIoa/tD7xqk199KQe5jv3ydH7+oE0nSkr7ZDbII0L=fXDLBCAVDYCcSWmuP2Lr0um1Sf0opxR0qUvzic1BR4FuBbGVW9KG+Fbixo96nxCKHhKe+C9blbKR2kiF19iKY9KlAFCpY2boamlnBqiPoX4xFikCaQOga8beKrKlreFmp3wkK83=8oy4eWaKnhTYR5V74R2tSxhFDL9GNySWv8KeD; tfstk=gLGSVCZPNgj5__smr3L4lnmUONVIRDON2waKS2CPJ7F8AwiEWJUPaUDIhDo72bP82ZUIjP_-TJ38AoUtf8CdeJUIGzosL6389JwQ5cULyHvuMrUgwJDzYurQO2m6uhRw_40utSKwbC7bLw_0_aUdYy3YMWzBgSjPa40utZxoJFuorMsoFIu89DFYHPz79yUdeENY7PNdwJCRHiE0JWFLe63AkyUgvTB-vqLbSoEL98hVRiaDFouWykYYDsOTn4Ef96hWE-Z1voU0ljTLelu8p6Cp-zw7X4EXjDS2S-33dXbhOR3-ID4t2gKQxjgxwAn90Tr-CygZd4dRM7loyAeK6HXKf7iQBbefJ13oyuPbkfLFIolb4Dh7HF5_LShaB7H2n3yUNPiKZ0_C9c3q7b2mOhsYxYzgMyGHW9ZQpg7N_l9Mh9_bI6abbETfK9vheh1QTEkiD8U0u58XlOW3er4bbETfK928orXwlE6NK; isg=BEFBtwDiwngWaS5hsMhDr7eEUI1bbrVgVAXBk6OWpMimimNc776ZMjbMbebM202Y`
      },
      data: requestBody,
      timeout: 60000 // 60 second timeout
    });

    // Parse and process the response
    let slideData = [];
    let rawContent = '';

    try {
      // Extract content from response based on Qwen's response structure
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        rawContent = response.data.choices[0].message.content;
      } else {
        console.warn("Unexpected Qwen response structure:", response.data);
        throw new Error("Unexpected response structure from Qwen API");
      }

      console.log("Raw response from Qwen:", rawContent);

      // Extract and parse JSON array from the response
      // Look for JSON array pattern (starting with [ and ending with ])
      const jsonMatch = rawContent.match(/\[\s*\{.*\}\s*\]/s);
      
      if (jsonMatch) {
        try {
          slideData = JSON.parse(jsonMatch[0]);
          console.log(`Successfully parsed JSON response with ${slideData.length} slides`);
        } catch (parseError) {
          console.error('Failed to parse extracted JSON:', parseError);
          throw new Error('Failed to parse AI response as valid JSON');
        }
      } else {
        // Fallback method - try to find JSON objects individually
        const slides = [];
        const regex = /\{\s*"title".*?\}\s*(?=,|\]|$)/gs;
        let match;
        
        while ((match = regex.exec(rawContent)) !== null) {
          try {
            const slideObj = JSON.parse(match[0]);
            if (slideObj.title) {
              slides.push(slideObj);
            }
          } catch (e) {
            console.warn('Could not parse individual slide object', match[0]);
          }
        }
        
        if (slides.length > 0) {
          console.log(`Extracted ${slides.length} slides using fallback method`);
          slideData = slides;
        } else {
          throw new Error('Could not extract valid slide data from response');
        }
      }

      // Validate we have the expected number of slides (or at least some slides)
      if (slideData.length === 0) {
        console.warn("AI returned no valid slides");
        slideData = []; // Return empty array, frontend will handle this
      } else if (slideData.length < slideCount) {
        console.warn(`AI returned fewer slides than requested: ${slideData.length} vs ${slideCount}`);
      }

      // Return the slide data to the frontend
      return res.status(200).json(slideData);

    } catch (parseError) {
      console.error("Error parsing Qwen response:", parseError);
      return res.status(500).json({ 
        error: 'Failed to process AI response', 
        details: parseError.message,
        rawContent: rawContent.substring(0, 500) + (rawContent.length > 500 ? '...' : '') // Send truncated raw content for debugging
      });
    }

  } catch (error) {
    console.error('Error in /api/generate-slides endpoint:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      console.error('Qwen API Error Status:', error.response.status);
      console.error('Qwen API Error Data:', error.response.data);
      res.status(error.response.status || 500).json({
        error: 'Failed to get valid response from Qwen API',
        details: error.response.data || error.message
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from Qwen API:', error.request);
      res.status(504).json({ 
        error: 'No response received from Qwen API (Timeout or Network Issue)', 
        details: error.message 
      });
    } else {
      // Something happened in setting up the request that triggered an error
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 