figma.showUI(__html__, { width: 240, height: 120 });

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255)).toString(16).slice(1).toUpperCase();
}

async function exportDesignTokens() {
  try {
    console.log('Exporting design tokens...');
    const tokens = {};
    const modeNames = {};

    // Get all variable collections
    const variableCollections = figma.variables.getLocalVariableCollections();
    console.log('Variable collections:', variableCollections);

    // Iterate through each variable collection
    for (const collection of variableCollections) {
      console.log('Processing collection:', collection.name);
      const collectionVariables = collection.variableIds;

      for (const variableId of collectionVariables) {
        const variable = figma.variables.getVariableById(variableId);
        console.log('Processing variable:', variable.name);

        // Group by type (color, typography, etc.)
        const type = variable.resolvedType.toLowerCase();
        if (!tokens[collection.name]) tokens[collection.name] = {};

        // Convert color values to hexadecimal or show reference name
        let value = variable.valuesByMode;
        const variableNameParts = variable.name.split('/');
        let currentLevel = tokens[collection.name];

        // Create nested structure based on variable name
        for (let i = 0; i < variableNameParts.length - 1; i++) {
          const part = variableNameParts[i];
          if (!currentLevel[part]) currentLevel[part] = {};
          currentLevel = currentLevel[part];
        }

        const lastPart = variableNameParts[variableNameParts.length - 1];
        currentLevel[lastPart] = {
          type: type,
          value: {},
          description: variable.description || "",
        };

        if (type === 'color') {
          for (const modeId in value) {
            const color = value[modeId];
            if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
              currentLevel[lastPart].value[modeId] = rgbToHex(color.r, color.g, color.b);
            } else if (color.type === 'VARIABLE_ALIAS') {
              const referencedVariable = figma.variables.getVariableById(color.id);
              const referencedCollection = variableCollections.find(col => col.variableIds.includes(color.id));
              currentLevel[lastPart].value[modeId] = `{${referencedCollection.name}.${referencedVariable.name.replace(/\//g, '.')}}`;
            }
          }
        } else {
          currentLevel[lastPart].value = value;
        }
      }
    }

    // Convert to JSON and send to the UI
    const json = JSON.stringify(tokens, null, 2);
    console.log('JSON output:', json);
    figma.ui.postMessage({ type: 'download', data: json });
  } catch (error) {
    console.error("Error exporting design tokens:", error);
  }
}

figma.ui.onmessage = async (msg) => {
  console.log('Message received from UI:', msg);
  if (msg.type === 'export') {
    await exportDesignTokens();  // Call export function when button is clicked
  }
};