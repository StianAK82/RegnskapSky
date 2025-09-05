/**
 * JSCodeshift transformer for fixing accessibility issues in React components
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasChanges = false;

  // Fix: Add missing alt attributes to img elements
  root.find(j.JSXElement)
    .filter(path => path.value.openingElement.name.name === 'img')
    .forEach(path => {
      const attributes = path.value.openingElement.attributes;
      const hasAlt = attributes.some(attr => 
        attr.type === 'JSXAttribute' && attr.name.name === 'alt'
      );
      
      if (!hasAlt) {
        attributes.push(
          j.jsxAttribute(
            j.jsxIdentifier('alt'),
            j.literal('')
          )
        );
        hasChanges = true;
        console.log(`Added alt attribute to img in ${file.path}`);
      }
    });

  // Fix: Add missing htmlFor to label elements
  root.find(j.JSXElement)
    .filter(path => path.value.openingElement.name.name === 'label')
    .forEach(path => {
      const attributes = path.value.openingElement.attributes;
      const hasHtmlFor = attributes.some(attr =>
        attr.type === 'JSXAttribute' && attr.name.name === 'htmlFor'
      );
      
      if (!hasHtmlFor) {
        // Try to find an associated input element to link to
        const labelContent = path.value.children;
        let inputId = null;
        
        // Check if there's an input inside the label
        j(path).find(j.JSXElement)
          .filter(inputPath => inputPath.value.openingElement.name.name === 'input')
          .forEach(inputPath => {
            const inputAttrs = inputPath.value.openingElement.attributes;
            const idAttr = inputAttrs.find(attr =>
              attr.type === 'JSXAttribute' && attr.name.name === 'id'
            );
            if (idAttr && idAttr.value) {
              inputId = idAttr.value.value || 'input-' + Math.random().toString(36).substr(2, 9);
            }
          });
        
        if (inputId) {
          attributes.push(
            j.jsxAttribute(
              j.jsxIdentifier('htmlFor'),
              j.literal(inputId)
            )
          );
          hasChanges = true;
          console.log(`Added htmlFor attribute to label in ${file.path}`);
        }
      }
    });

  // Fix: Add missing type attribute to button elements
  root.find(j.JSXElement)
    .filter(path => path.value.openingElement.name.name === 'button')
    .forEach(path => {
      const attributes = path.value.openingElement.attributes;
      const hasType = attributes.some(attr =>
        attr.type === 'JSXAttribute' && attr.name.name === 'type'
      );
      
      if (!hasType) {
        attributes.push(
          j.jsxAttribute(
            j.jsxIdentifier('type'),
            j.literal('button')
          )
        );
        hasChanges = true;
        console.log(`Added type="button" to button in ${file.path}`);
      }
    });

  // Fix: Add missing role to interactive elements that need it
  root.find(j.JSXElement)
    .filter(path => {
      const name = path.value.openingElement.name.name;
      return ['div', 'span'].includes(name);
    })
    .forEach(path => {
      const attributes = path.value.openingElement.attributes;
      const hasOnClick = attributes.some(attr =>
        attr.type === 'JSXAttribute' && attr.name.name === 'onClick'
      );
      const hasRole = attributes.some(attr =>
        attr.type === 'JSXAttribute' && attr.name.name === 'role'
      );
      
      if (hasOnClick && !hasRole) {
        attributes.push(
          j.jsxAttribute(
            j.jsxIdentifier('role'),
            j.literal('button')
          )
        );
        hasChanges = true;
        console.log(`Added role="button" to clickable element in ${file.path}`);
      }
    });

  // Fix: Add missing tabIndex to interactive elements
  root.find(j.JSXElement)
    .filter(path => {
      const name = path.value.openingElement.name.name;
      return ['div', 'span'].includes(name);
    })
    .forEach(path => {
      const attributes = path.value.openingElement.attributes;
      const hasOnClick = attributes.some(attr =>
        attr.type === 'JSXAttribute' && attr.name.name === 'onClick'
      );
      const hasTabIndex = attributes.some(attr =>
        attr.type === 'JSXAttribute' && attr.name.name === 'tabIndex'
      );
      
      if (hasOnClick && !hasTabIndex) {
        attributes.push(
          j.jsxAttribute(
            j.jsxIdentifier('tabIndex'),
            j.jsxExpressionContainer(j.literal(0))
          )
        );
        hasChanges = true;
        console.log(`Added tabIndex={0} to clickable element in ${file.path}`);
      }
    });

  return hasChanges ? root.toSource({ quote: 'single' }) : undefined;
};

module.exports.parser = 'tsx';