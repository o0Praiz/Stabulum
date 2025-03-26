// Stabulum Documentation Generator
// Main file: documentationGenerator.ts

import * as fs from 'fs';
import * as path from 'path';
import { parse as parseJsDoc } from 'doctrine';
import { parse as parseSolidity } from '@solidity-parser/parser';
import * as MarkdownIt from 'markdown-it';
import * as handlebars from 'handlebars';
import { execSync } from 'child_process';

// Types for documentation generation
interface DocumentationConfig {
  title: string;
  description: string;
  version: string;
  outputDir: string;
  sources: {
    solidity: string[];
    typescript: string[];
    javascript: string[];
    markdown: string[];
  };
  templates: {
    main: string;
    contract: string;
    function: string;
    event: string;
    module: string;
  };
  excludePatterns: string[];
  includePrivate: boolean;
  generateDiagrams: boolean;
  branding: {
    logo: string;
    colors: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
    };
  };
}

interface ContractDocumentation {
  name: string;
  description: string;
  author: string;
  version: string;
  functions: FunctionDocumentation[];
  events: EventDocumentation[];
  variables: VariableDocumentation[];
  imports: string[];
  inheritance: string[];
  filePath: string;
  sourceCode: string;
  natspec: any;
}

interface FunctionDocumentation {
  name: string;
  description: string;
  visibility: string;
  stateMutability: string;
  modifiers: string[];
  params: ParameterDocumentation[];
  returns: ReturnDocumentation[];
  source: string;
  natspec: any;
}

interface EventDocumentation {
  name: string;
  description: string;
  params: ParameterDocumentation[];
  source: string;
  natspec: any;
}

interface ParameterDocumentation {
  name: string;
  description: string;
  type: string;
}

interface ReturnDocumentation {
  description: string;
  type: string;
}

interface VariableDocumentation {
  name: string;
  description: string;
  type: string;
  visibility: string;
  constant: boolean;
  source: string;
  natspec: any;
}

interface ModuleDocumentation {
  name: string;
  description: string;
  functions: FunctionDocumentation[];
  classes: ClassDocumentation[];
  interfaces: InterfaceDocumentation[];
  filePath: string;
  sourceCode: string;
}

interface ClassDocumentation {
  name: string;
  description: string;
  methods: FunctionDocumentation[];
  properties: PropertyDocumentation[];
}

interface InterfaceDocumentation {
  name: string;
  description: string;
  methods: FunctionDocumentation[];
  properties: PropertyDocumentation[];
}

interface PropertyDocumentation {
  name: string;
  description: string;
  type: string;
  visibility: string;
  default: string;
}

// Main Documentation Generator Class
export class StabulumDocumentationGenerator {
  private config: DocumentationConfig;
  private contracts: ContractDocumentation[] = [];
  private modules: ModuleDocumentation[] = [];
  private markdown: { filePath: string; content: string }[] = [];
  private md: MarkdownIt;

  constructor(configPath: string) {
    this.config = this.loadConfig(configPath);
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    });
    this.registerHelpers();
  }

  private loadConfig(configPath: string): DocumentationConfig {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent) as DocumentationConfig;
    } catch (error) {
      console.error(`Error loading configuration: ${error}`);
      process.exit(1);
    }
  }

  private registerHelpers(): void {
    handlebars.registerHelper('markdown', (content) => {
      if (!content) return '';
      return new handlebars.SafeString(this.md.render(content));
    });

    handlebars.registerHelper('anchorLink', (text) => {
      if (!text) return '';
      return text.toLowerCase().replace(/[^\w]+/g, '-');
    });

    handlebars.registerHelper('parameterList', (params) => {
      if (!params || !params.length) return '()';
      return `(${params.map(p => `${p.type} ${p.name}`).join(', ')})`;
    });
  }

  public async generate(): Promise<void> {
    console.log('Starting Stabulum documentation generation...');
    
    this.createOutputDirectory();
    await this.processSourceFiles();
    await this.generateDocumentation();
    
    if (this.config.generateDiagrams) {
      await this.generateDiagrams();
    }
    
    console.log(`Documentation successfully generated in ${this.config.outputDir}`);
  }

  private createOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
    
    // Create subdirectories
    const subdirs = ['contracts', 'modules', 'guides', 'assets', 'diagrams', 'api'];
    for (const dir of subdirs) {
      const dirPath = path.join(this.config.outputDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
    
    // Copy branding assets
    if (this.config.branding.logo && fs.existsSync(this.config.branding.logo)) {
      fs.copyFileSync(
        this.config.branding.logo,
        path.join(this.config.outputDir, 'assets', path.basename(this.config.branding.logo))
      );
    }
  }

  private async processSourceFiles(): Promise<void> {
    // Process Solidity files
    for (const pattern of this.config.sources.solidity) {
      const files = this.resolveGlobPattern(pattern);
      for (const file of files) {
        if (this.isExcluded(file)) continue;
        this.contracts.push(await this.processSolidityFile(file));
      }
    }
    
    // Process TypeScript files
    for (const pattern of this.config.sources.typescript) {
      const files = this.resolveGlobPattern(pattern);
      for (const file of files) {
        if (this.isExcluded(file)) continue;
        this.modules.push(await this.processTypeScriptFile(file));
      }
    }
    
    // Process JavaScript files
    for (const pattern of this.config.sources.javascript) {
      const files = this.resolveGlobPattern(pattern);
      for (const file of files) {
        if (this.isExcluded(file)) continue;
        this.modules.push(await this.processJavaScriptFile(file));
      }
    }
    
    // Process Markdown files
    for (const pattern of this.config.sources.markdown) {
      const files = this.resolveGlobPattern(pattern);
      for (const file of files) {
        if (this.isExcluded(file)) continue;
        this.markdown.push({
          filePath: file,
          content: fs.readFileSync(file, 'utf8')
        });
      }
    }
  }

  private resolveGlobPattern(pattern: string): string[] {
    // Simple glob implementation for demo - in production would use a proper glob library
    // This is a simplified version that just handles * and ** patterns
    if (pattern.includes('*')) {
      const basePath = pattern.substring(0, pattern.indexOf('*'));
      const extension = path.extname(pattern);
      return this.getAllFiles(basePath, extension);
    }
    return [pattern];
  }

  private getAllFiles(dir: string, extension: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      
      if (stat && stat.isDirectory()) {
        results = results.concat(this.getAllFiles(file, extension));
      } else {
        if (file.endsWith(extension)) {
          results.push(file);
        }
      }
    });
    
    return results;
  }

  private isExcluded(filePath: string): boolean {
    return this.config.excludePatterns.some(pattern => 
      filePath.includes(pattern)
    );
  }

  private async processSolidityFile(filePath: string): Promise<ContractDocumentation> {
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
      const ast = parseSolidity(content, { loc: true, range: true });
      
      // This is a simplified parser for demo purposes
      // In a real implementation, we would traverse the AST properly
      const contractNode = ast.children.find(node => 
        node.type === 'ContractDefinition'
      );
      
      if (!contractNode) {
        throw new Error('No contract found in file');
      }
      
      const contractDoc: ContractDocumentation = {
        name: contractNode.name,
        description: this.extractNatspecDescription(content, contractNode),
        author: this.extractNatspecTag(content, contractNode, '@author'),
        version: this.extractNatspecTag(content, contractNode, '@dev'),
        functions: this.extractFunctions(content, contractNode),
        events: this.extractEvents(content, contractNode),
        variables: this.extractVariables(content, contractNode),
        imports: this.extractImports(ast),
        inheritance: this.extractInheritance(contractNode),
        filePath,
        sourceCode: content,
        natspec: this.extractFullNatspec(content, contractNode)
      };
      
      return contractDoc;
    } catch (error) {
      console.error(`Error processing Solidity file ${filePath}: ${error}`);
      // Return a placeholder for failed parsing
      return {
        name: path.basename(filePath, '.sol'),
        description: 'Error: Failed to parse contract',
        author: '',
        version: '',
        functions: [],
        events: [],
        variables: [],
        imports: [],
        inheritance: [],
        filePath,
        sourceCode: content,
        natspec: {}
      };
    }
  }

  // Mock implementations for demonstration purposes
  // In a real application, we would have proper implementations for these methods
  private extractNatspecDescription(content: string, node: any): string {
    return 'Contract description extracted from NatSpec comments';
  }

  private extractNatspecTag(content: string, node: any, tag: string): string {
    return `Value for ${tag}`;
  }

  private extractFunctions(content: string, contractNode: any): FunctionDocumentation[] {
    // In a real implementation, this would parse the contract AST and extract function definitions
    return [{
      name: 'exampleFunction',
      description: 'Example function description',
      visibility: 'public',
      stateMutability: 'view',
      modifiers: ['onlyOwner'],
      params: [{
        name: 'param1',
        description: 'First parameter',
        type: 'uint256'
      }],
      returns: [{
        description: 'Return value description',
        type: 'bool'
      }],
      source: 'function exampleFunction(uint256 param1) public view onlyOwner returns (bool) { ... }',
      natspec: {}
    }];
  }

  private extractEvents(content: string, contractNode: any): EventDocumentation[] {
    return [{
      name: 'ExampleEvent',
      description: 'Example event emitted when something happens',
      params: [{
        name: 'param1',
        description: 'First parameter',
        type: 'uint256'
      }],
      source: 'event ExampleEvent(uint256 param1);',
      natspec: {}
    }];
  }

  private extractVariables(content: string, contractNode: any): VariableDocumentation[] {
    return [{
      name: 'exampleVariable',
      description: 'Example state variable',
      type: 'uint256',
      visibility: 'private',
      constant: false,
      source: 'uint256 private exampleVariable;',
      natspec: {}
    }];
  }

  private extractImports(ast: any): string[] {
    return ['@openzeppelin/contracts/token/ERC20/ERC20.sol'];
  }

  private extractInheritance(contractNode: any): string[] {
    return ['ERC20', 'Ownable'];
  }

  private extractFullNatspec(content: string, node: any): any {
    return {
      title: 'Example Contract',
      description: 'This is an example contract for demonstration',
      author: 'Stabulum Team',
      dev: 'Development notes here',
      notice: 'Public notice about contract usage'
    };
  }

  private async processTypeScriptFile(filePath: string): Promise<ModuleDocumentation> {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // In a real implementation, we would use TypeScript compiler API to parse the file
    // This is a simplified placeholder
    return {
      name: path.basename(filePath, '.ts'),
      description: 'TypeScript module description',
      functions: [],
      classes: [{
        name: 'ExampleClass',
        description: 'Example class documentation',
        methods: [],
        properties: []
      }],
      interfaces: [],
      filePath,
      sourceCode: content
    };
  }

  private async processJavaScriptFile(filePath: string): Promise<ModuleDocumentation> {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Similar to TypeScript but for JavaScript
    return {
      name: path.basename(filePath, '.js'),
      description: 'JavaScript module description',
      functions: [],
      classes: [],
      interfaces: [],
      filePath,
      sourceCode: content
    };
  }

  private async generateDocumentation(): Promise<void> {
    // Load templates
    const mainTemplate = this.loadTemplate(this.config.templates.main);
    const contractTemplate = this.loadTemplate(this.config.templates.contract);
    const functionTemplate = this.loadTemplate(this.config.templates.function);
    const moduleTemplate = this.loadTemplate(this.config.templates.module);
    
    // Generate main index file
    this.generateMainIndex(mainTemplate);
    
    // Generate contract documentation
    for (const contract of this.contracts) {
      this.generateContractDocumentation(contract, contractTemplate, functionTemplate);
    }
    
    // Generate module documentation
    for (const module of this.modules) {
      this.generateModuleDocumentation(module, moduleTemplate);
    }
    
    // Copy markdown guides
    for (const md of this.markdown) {
      const outputPath = path.join(
        this.config.outputDir, 
        'guides', 
        path.basename(md.filePath)
      );
      fs.writeFileSync(outputPath, md.content);
    }
    
    // Generate search index
    this.generateSearchIndex();
    
    // Generate API reference
    this.generateApiReference();
  }

  private loadTemplate(templatePath: string): HandlebarsTemplateDelegate {
    try {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      return handlebars.compile(templateContent);
    } catch (error) {
      console.error(`Error loading template ${templatePath}: ${error}`);
      // Provide a simple default template
      return handlebars.compile('<h1>{{title}}</h1><p>{{description}}</p>');
    }
  }

  private generateMainIndex(template: HandlebarsTemplateDelegate): void {
    const output = template({
      title: this.config.title,
      description: this.config.description,
      version: this.config.version,
      contracts: this.contracts.map(c => ({
        name: c.name,
        description: c.description,
        link: `contracts/${c.name}.html`
      })),
      modules: this.modules.map(m => ({
        name: m.name,
        description: m.description,
        link: `modules/${m.name}.html`
      })),
      guides: this.markdown.map(m => ({
        name: path.basename(m.filePath, path.extname(m.filePath)),
        link: `guides/${path.basename(m.filePath)}`
      })),
      branding: this.config.branding
    });
    
    fs.writeFileSync(path.join(this.config.outputDir, 'index.html'), output);
  }

  private generateContractDocumentation(
    contract: ContractDocumentation, 
    contractTemplate: HandlebarsTemplateDelegate,
    functionTemplate: HandlebarsTemplateDelegate
  ): void {
    // Generate main contract file
    const output = contractTemplate({
      contract,
      branding: this.config.branding
    });
    
    fs.writeFileSync(
      path.join(this.config.outputDir, 'contracts', `${contract.name}.html`),
      output
    );
    
    // Generate individual function pages
    for (const func of contract.functions) {
      const funcOutput = functionTemplate({
        contract,
        function: func,
        branding: this.config.branding
      });
      
      const funcDir = path.join(
        this.config.outputDir, 
        'contracts', 
        contract.name, 
        'functions'
      );
      
      if (!fs.existsSync(funcDir)) {
        fs.mkdirSync(funcDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(funcDir, `${func.name}.html`),
        funcOutput
      );
    }
  }

  private generateModuleDocumentation(
    module: ModuleDocumentation, 
    moduleTemplate: HandlebarsTemplateDelegate
  ): void {
    const output = moduleTemplate({
      module,
      branding: this.config.branding
    });
    
    fs.writeFileSync(
      path.join(this.config.outputDir, 'modules', `${module.name}.html`),
      output
    );
  }

  private generateSearchIndex(): void {
    const searchData = {
      version: this.config.version,
      contracts: this.contracts.map(c => ({
        name: c.name,
        description: c.description,
        type: 'contract',
        url: `contracts/${c.name}.html`,
        functions: c.functions.map(f => ({
          name: f.name,
          description: f.description,
          url: `contracts/${c.name}/functions/${f.name}.html`
        })),
        events: c.events.map(e => ({
          name: e.name,
          description: e.description,
          url: `contracts/${c.name}.html#event-${e.name}`
        }))
      })),
      modules: this.modules.map(m => ({
        name: m.name,
        description: m.description,
        type: 'module',
        url: `modules/${m.name}.html`
      }))
    };
    
    fs.writeFileSync(
      path.join(this.config.outputDir, 'search-index.json'),
      JSON.stringify(searchData, null, 2)
    );
  }

  private generateApiReference(): void {
    // Generate a comprehensive API reference
    // This would typically combine information from all sources
    const apiReference = {
      title: `${this.config.title} API Reference`,
      version: this.config.version,
      contracts: this.contracts.map(c => ({
        name: c.name,
        description: c.description,
        functions: c.functions.map(f => ({
          signature: `function ${f.name}(${f.params.map(p => `${p.type} ${p.name}`).join(', ')}) ${f.visibility} ${f.stateMutability} returns (${f.returns.map(r => r.type).join(', ')})`,
          description: f.description,
          params: f.params,
          returns: f.returns
        })),
        events: c.events
      }))
    };
    
    fs.writeFileSync(
      path.join(this.config.outputDir, 'api', 'reference.json'),
      JSON.stringify(apiReference, null, 2)
    );
  }

  private async generateDiagrams(): Promise<void> {
    try {
      // Generate contract inheritance diagram
      this.generateInheritanceDiagram();
      
      // Generate contract interaction diagram
      this.generateInteractionDiagram();
      
      // Generate system architecture diagram
      this.generateArchitectureDiagram();
    } catch (error) {
      console.error(`Error generating diagrams: ${error}`);
    }
  }

  private generateInheritanceDiagram(): void {
    const diagramCode = `
    classDiagram
      class ERC20
      class Ownable
      ${this.contracts.map(c => `class ${c.name}`).join('\n      ')}
      
      ${this.contracts.flatMap(c => 
        c.inheritance.map(i => `${i} <|-- ${c.name}`)
      ).join('\n      ')}
    `;
    
    this.generateMermaidDiagram('inheritance-diagram', diagramCode);
  }

  private generateInteractionDiagram(): void {
    const diagramCode = `
    sequenceDiagram
      participant User
      participant StabulumToken
      participant ReserveManager
      
      User->>StabulumToken: mint(amount)
      StabulumToken->>ReserveManager: verifyReserves()
      ReserveManager-->>StabulumToken: reserves verified
      StabulumToken-->>User: tokens minted
    `;
    
    this.generateMermaidDiagram('interaction-diagram', diagramCode);
  }

  private generateArchitectureDiagram(): void {
    const diagramCode = `
    flowchart TB
      User[User] --> StabulumToken[Stabulum Token]
      StabulumToken --> ReserveManager[Reserve Manager]
      StabulumToken --> GovernanceContract[Governance]
      StabulumToken --> StabilityMechanism[Stability Mechanism]
      ReserveManager --> Oracle[Price Oracle]
      GovernanceContract --> Treasury[Treasury]
    `;
    
    this.generateMermaidDiagram('architecture-diagram', diagramCode);
  }

  private generateMermaidDiagram(name: string, code: string): void {
    const diagramPath = path.join(this.config.outputDir, 'diagrams', `${name}.md`);
    fs.writeFileSync(diagramPath, `\`\`\`mermaid\n${code}\n\`\`\``);
    
    try {
      // This assumes mermaid-cli is installed
      // In a real implementation, we would check for its existence
      execSync(`npx mmdc -i ${diagramPath} -o ${path.join(this.config.outputDir, 'diagrams', `${name}.svg`)}`);
    } catch (error) {
      console.error(`Failed to generate diagram ${name}: ${error}`);
    }
  }
}
