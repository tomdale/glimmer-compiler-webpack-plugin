import { ASTPluginBuilder } from '@glimmer/syntax';
import { TemplateLocator } from '@glimmer/bundle-compiler';

export default interface BundlePlugin<TemplateMeta> {
  astPluginsFor(locator: TemplateLocator<TemplateMeta>): ASTPluginBuilder[];
}
