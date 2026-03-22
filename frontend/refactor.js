const fs = require('fs');
const path = require('path');

const files = [
  "src/app/academic-programs/pages/program-detail/program-detail.component.ts",
  "src/app/academic-programs/pages/program-form/program-form.component.ts",
  "src/app/academic-programs/pages/program-list/program-list.component.ts",
  "src/app/clinical-services/pages/service-form/service-form.component.ts",
  "src/app/clinical-services/pages/service-list/service-list.component.ts",
  "src/app/service-capacity/pages/capacity-config/capacity-config.component.ts",
  "src/app/service-capacity/pages/service-capacity-form/service-capacity-form.component.ts",
  "src/app/service-capacity/pages/service-capacity-list/service-capacity-list.component.ts",
  "src/app/shared/ui/badge/badge.component.ts",
  "src/app/shared/ui/button/button.component.ts",
  "src/app/shared/ui/card/card.component.ts",
  "src/app/shared/ui/file-upload/file-upload.component.ts",
  "src/app/shared/ui/form-field/form-field.component.ts",
  "src/app/shared/ui/input/input.component.ts",
  "src/app/shared/ui/modal/modal.component.ts",
  "src/app/shared/ui/select/select.component.ts",
  "src/app/shared/ui/table/table.component.ts"
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log("Not found:", file);
    return;
  }
  let content = fs.readFileSync(file, "utf8");

  let hasChanges = false;
  
  const baseName = path.basename(file, ".ts");
  const dirName = path.dirname(file);

  // Extract template
  const templateRegex = /template:\s*`([\s\S]*?)`\s*(,?)/;
  const templateMatch = content.match(templateRegex);
  
  if (templateMatch) {
    const htmlContent = templateMatch[1];
    fs.writeFileSync(path.join(dirName, baseName + ".html"), htmlContent.trim(), "utf8");
    content = content.replace(templateMatch[0], `templateUrl: './${baseName}.html'${templateMatch[2]}`);
    hasChanges = true;
  }
  
  // Extract styles
  // Account for optional array wrappers styles: [`...`] or styles: `...`
  const stylesRegex = /styles:\s*(?:\[\s*)?`([\s\S]*?)`(?:\s*\])?\s*(,?)/;
  const stylesMatch = content.match(stylesRegex);
  
  if (stylesMatch) {
    const cssContent = stylesMatch[1];
    fs.writeFileSync(path.join(dirName, baseName + ".css"), cssContent.trim(), "utf8");
    content = content.replace(stylesMatch[0], `styleUrls: ['./${baseName}.css']${stylesMatch[2]}`);
    hasChanges = true;
  }

  if (hasChanges) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`Refactored: ${file}`);
  }
});
