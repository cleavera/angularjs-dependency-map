import { readFileSync, writeFile } from 'fs';
import { sync as glob } from 'glob';

const configs: Array<string> = glob('./+(areas|components|services|entities|constants)/*/**/*.config.js');
const depTree: any = {};
const dependeeCount: any = {};
let downgraded: Array<string> = [];

configs.forEach((config: string) => {
    const matches: RegExpMatchArray | null = config.match(/^(.+\/)(.+)(\.config\.js)$/);

    if (!matches) {
        throw new Error(`There was an error with the filename: ${config}`);
    }

    const path: string = matches[1];
    const name: string = matches[2];

    const componentDefs: Array<string> = glob(`${path}${name}*.js`);

    componentDefs.forEach((defFile: string) => {
        const contents: string = readFileSync(defFile, 'utf-8');

        const controllerDeps: Array<string> = getControllerDeps(contents);
        const directiveDeps: Array<string> = getDirectiveDeps(contents);
        const serviceDeps: Array<string> = getServiceDeps(contents);
        const factoryDeps: Array<string> = getFactoryDeps(contents);
        const providerDeps: Array<string> = getProviderDeps(contents);
        const componentDeps: Array<string> = getComponentDeps(contents);

        const deps: Array<string> = controllerDeps.concat(directiveDeps).concat(serviceDeps).concat(factoryDeps).concat(providerDeps).concat(componentDeps);

        if (!(name in depTree)) {
            depTree[name] = { services: deps, components: [] };
        } else {
            depTree[name].services = depTree[name].services.concat(deps);
        }

        deps.forEach((dep: string) => {
            if (!(dep in dependeeCount)) {
                dependeeCount[dep] = 1;
            } else {
                dependeeCount[dep]++;
            }
        });
    });

    const componentTemplates: Array<string> = glob(`${path}${name}*.html`);

    componentTemplates.forEach((template: string) => {
        const contents: string = readFileSync(template, 'utf-8');

        const components: Array<string> = getTemplateComponentDeps(contents);

        const deps: Array<string> = components;

        if (!(name in depTree)) {
            depTree[name] = { services: [], deps };
        } else {
            depTree[name].components = depTree[name].components.concat(deps);
        }

        deps.forEach((dep: string) => {
            if (!(dep in dependeeCount)) {
                dependeeCount[dep] = 1;
            } else {
                dependeeCount[dep]++;
            }
        });
    });
});

const downgradeFiles: Array<string> = glob('../**/*.angularjs.ts');

downgradeFiles.forEach((file: string) => {
    const contents: string = readFileSync(file, 'utf-8');

    downgraded = downgraded
        .concat(getDowngradedComponents(contents))
        .concat(getDowngradedConstants(contents))
        .concat(getDowngradedProviders(contents))
        .concat(getDowngradedFilters(contents))
        .concat(getDowngradedFactory(contents));
});

writeFile('./depTree.json', JSON.stringify(depTree), { encoding: 'utf-8' }, (err: NodeJS.ErrnoException) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Constructed dep tree for ${Object.keys(depTree).length} items`);
    }
});

writeFile('./depCount.json', JSON.stringify(dependeeCount), { encoding: 'utf-8' }, (err: NodeJS.ErrnoException) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Total number of dependencies ${Object.keys(dependeeCount).length}`);
    }
});

writeFile('./downgraded.json', JSON.stringify(downgraded), { encoding: 'utf-8' }, (err: NodeJS.ErrnoException) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Total number of downgraded components ${downgraded.length}`);
    }
});

function getControllerDeps(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/\.controller\('[A-z$]+?', \[(('[A-z$]+?',\s)*)/);

    if (matches) {
        if (matches[1]) {
            return matches[1].replace(/(')|(,\s$)/g, '').replace(/,\s/g, ',').split(',');
        }
    }

    return [];
}

function getDirectiveDeps(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/\.directive\('[A-z$]+?', \[(('[A-z$]+?',\s)*)/);

    if (matches) {
        if (matches[1]) {
            return matches[1].replace(/(')|(,\s$)/g, '').replace(/,\s/g, ',').split(',');
        }
    }

    return [];
}

function getServiceDeps(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/\.service\('[A-z$]+?', \[(('[A-z$]+?',\s)*)/);

    if (matches) {
        if (matches[1]) {
            return matches[1].replace(/(')|(,\s$)/g, '').replace(/,\s/g, ',').split(',');
        }
    }

    return [];
}

function getFactoryDeps(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/\.factory\('[A-z$]+?', \[(('[A-z$]+?',\s)*)/);

    if (matches) {
        if (matches[1]) {
            return matches[1].replace(/(')|(,\s$)/g, '').replace(/,\s/g, ',').split(',');
        }
    }

    return [];
}

function getProviderDeps(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/\.provider\('[A-z$]+?', \[(('[A-z$]+?',\s)*)/);

    if (matches) {
        if (matches[1]) {
            return matches[1].replace(/(')|(,\s$)/g, '').replace(/,\s/g, ',').split(',');
        }
    }

    return [];
}

function getComponentDeps(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/controller: \[(('[A-z$]+?',\s)*)/);

    if (matches) {
        if (matches[1]) {
            return matches[1].replace(/(')|(,\s$)/g, '').replace(/,\s/g, ',').split(',');
        }
    }

    return [];
}

function getTemplateComponentDeps(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/<(mhr-[A-z-]+)/g);

    if (matches) {
        return matches.map((match: string): string => {
            return match.substr(1, match.length).replace(/(?:-)([a-z])/g, (_match: string, letter: string) => {
                return letter.toUpperCase();
            });
        });
    }

    return [];
}

function getDowngradedComponents(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/\.directive\('([A-z$]+)', downgradeComponent\(/g);

    if (matches) {
        return matches.map((match: string): string => {
            return match.replace(/\.directive\('([A-z$]+)', downgradeComponent\(/g, '$1');
        });
    }

    return [];
}

function getDowngradedConstants(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/\.constant\('([A-z$]+)', /g);

    if (matches) {
        return matches.map((match: string): string => {
            return match.replace(/\.constant\('([A-z$]+)', /g, '$1');
        });
    }

    return [];
}

function getDowngradedProviders(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/\.provider\('([A-z$]+)', /g);

    if (matches) {
        return matches.map((match: string): string => {
            return match.replace(/\.provider\('([A-z$]+)', /g, '$1');
        });
    }

    return [];
}

function getDowngradedFilters(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/\.filter\('([A-z$]+)', /g);

    if (matches) {
        return matches.map((match: string): string => {
            return match.replace(/\.filter\('([A-z$]+)', /g, '$1');
        });
    }

    return [];
}

function getDowngradedFactory(contents: string): Array<string> {
    const matches: RegExpMatchArray | null = contents.match(/\.factory\('([A-z$]+)', /g);

    if (matches) {
        return matches.map((match: string): string => {
            return match.replace(/\.factory\('([A-z$]+)', /g, '$1');
        });
    }

    return [];
}
