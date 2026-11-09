"""Generate the checked-in Xcode project with no third-party dependencies."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1]
objects = {}
def uid(value): return hashlib.sha256(value.encode()).hexdigest()[:24].upper()
def ref(value): return uid(value)
def add(key, value): objects[uid(key)] = value; return uid(key)
def quote(value): return json.dumps(str(value))
def render(value):
    if isinstance(value, dict): return '{ ' + ' '.join(f'{k} = {render(v)};' for k, v in value.items()) + ' }'
    if isinstance(value, list): return '( ' + ', '.join(render(v) for v in value) + ' )'
    return quote(value)

sources = sorted(str(p.relative_to(root)) for d in ['App', 'Sources'] for p in (root/d).rglob('*.swift'))
resources = ['Resources/PrivacyInfo.xcprivacy'] + sorted(str(p.relative_to(root)) for p in (root/'Resources').glob('*.png'))
files = []
test_sources = ['UITests/LupoUITests.swift']
for path in sources + resources + test_sources + ['Resources/Info.plist']:
    f = add(path, {'isa':'PBXFileReference', 'lastKnownFileType': 'sourcecode.swift' if path.endswith('.swift') else 'image.png' if path.endswith('.png') else 'text.plist.xml', 'path':path, 'sourceTree':'<group>'})
    files.append(f)
    add('build:'+path, {'isa':'PBXBuildFile','fileRef':f})
product = add('product', {'isa':'PBXFileReference','explicitFileType':'wrapper.application','includeInIndex':0,'path':'Lupo.app','sourceTree':'BUILT_PRODUCTS_DIR'})
test_product = add('test-product', {'isa':'PBXFileReference','explicitFileType':'wrapper.cfbundle','includeInIndex':0,'path':'LupoUITests.xctest','sourceTree':'BUILT_PRODUCTS_DIR'})
products = add('products', {'isa':'PBXGroup','children':[product,test_product],'name':'Products','sourceTree':'<group>'})
group = add('group', {'isa':'PBXGroup','children':files+[products],'sourceTree':'<group>'})
source_phase = add('source-phase', {'isa':'PBXSourcesBuildPhase','buildActionMask':2147483647,'files':[ref('build:'+p) for p in sources],'runOnlyForDeploymentPostprocessing':0})
resource_phase = add('resource-phase', {'isa':'PBXResourcesBuildPhase','buildActionMask':2147483647,'files':[ref('build:'+p) for p in resources],'runOnlyForDeploymentPostprocessing':0})
framework_phase = add('framework-phase', {'isa':'PBXFrameworksBuildPhase','buildActionMask':2147483647,'files':[],'runOnlyForDeploymentPostprocessing':0})
for scope in ['project', 'target']:
    configs=[]
    for mode in ['Debug', 'Release']:
        settings = {'CLANG_ENABLE_MODULES':'YES','SWIFT_VERSION':'6.0','IPHONEOS_DEPLOYMENT_TARGET':'17.0','SDKROOT':'iphoneos','SWIFT_OPTIMIZATION_LEVEL':'-Onone' if mode == 'Debug' else '-O','SWIFT_ACTIVE_COMPILATION_CONDITIONS':'DEBUG' if mode == 'Debug' else ''}
        if scope == 'target': settings.update({'PRODUCT_NAME':'Lupo','PRODUCT_BUNDLE_IDENTIFIER':'com.chlebholdings.lupo','INFOPLIST_FILE':'Resources/Info.plist','MARKETING_VERSION':'2.0','CURRENT_PROJECT_VERSION':'1','TARGETED_DEVICE_FAMILY':'1','CODE_SIGN_STYLE':'Automatic','GENERATE_INFOPLIST_FILE':'NO','SUPPORTED_PLATFORMS':'iphoneos iphonesimulator','SUPPORTS_MACCATALYST':'NO','LD_RUNPATH_SEARCH_PATHS':'$(inherited) @executable_path/Frameworks'})
        configs.append(add(scope+mode, {'isa':'XCBuildConfiguration','buildSettings':settings,'name':mode}))
    add(scope+'configs', {'isa':'XCConfigurationList','buildConfigurations':configs,'defaultConfigurationIsVisible':0,'defaultConfigurationName':'Release'})
target = add('target', {'isa':'PBXNativeTarget','buildConfigurationList':ref('targetconfigs'),'buildPhases':[source_phase,framework_phase,resource_phase],'buildRules':[],'dependencies':[],'name':'Lupo','productName':'Lupo','productReference':product,'productType':'com.apple.product-type.application'})
test_source_phase = add('test-source-phase', {'isa':'PBXSourcesBuildPhase','buildActionMask':2147483647,'files':[ref('build:'+p) for p in test_sources],'runOnlyForDeploymentPostprocessing':0})
test_framework_phase = add('test-framework-phase', {'isa':'PBXFrameworksBuildPhase','buildActionMask':2147483647,'files':[],'runOnlyForDeploymentPostprocessing':0})
proxy = add('test-proxy', {'isa':'PBXContainerItemProxy','containerPortal':ref('project'),'proxyType':1,'remoteGlobalIDString':target,'remoteInfo':'Lupo'})
dependency = add('test-dependency', {'isa':'PBXTargetDependency','target':target,'targetProxy':proxy})
test_configs=[]
for mode in ['Debug', 'Release']:
    settings={'PRODUCT_NAME':'$(TARGET_NAME)','PRODUCT_BUNDLE_IDENTIFIER':'com.chlebholdings.lupo.uitests','GENERATE_INFOPLIST_FILE':'YES','TEST_TARGET_NAME':'Lupo','TARGETED_DEVICE_FAMILY':'1','CODE_SIGN_STYLE':'Automatic','SUPPORTED_PLATFORMS':'iphoneos iphonesimulator','SWIFT_VERSION':'6.0','LD_RUNPATH_SEARCH_PATHS':'$(inherited) @executable_path/Frameworks @loader_path/Frameworks'}
    test_configs.append(add('test'+mode, {'isa':'XCBuildConfiguration','buildSettings':settings,'name':mode}))
add('testconfigs', {'isa':'XCConfigurationList','buildConfigurations':test_configs,'defaultConfigurationIsVisible':0,'defaultConfigurationName':'Release'})
test_target=add('test-target', {'isa':'PBXNativeTarget','buildConfigurationList':ref('testconfigs'),'buildPhases':[test_source_phase,test_framework_phase],'buildRules':[],'dependencies':[dependency],'name':'LupoUITests','productName':'LupoUITests','productReference':test_product,'productType':'com.apple.product-type.bundle.ui-testing'})
project = add('project', {'isa':'PBXProject','attributes':{'LastUpgradeCheck':'1600'},'buildConfigurationList':ref('projectconfigs'),'compatibilityVersion':'Xcode 14.0','developmentRegion':'en','hasScannedForEncodings':0,'knownRegions':['en','Base'],'mainGroup':group,'productRefGroup':products,'projectDirPath':'','projectRoot':'','targets':[target,test_target]})
project_dir = root/'Lupo.xcodeproj'
project_dir.mkdir(exist_ok=True)
(project_dir/'project.pbxproj').write_text('// !$*UTF8*$!\n' + render({'archiveVersion':1,'classes':{},'objectVersion':56,'objects':objects,'rootObject':project})+'\n')
schemes = project_dir/'xcshareddata'/'xcschemes'; schemes.mkdir(parents=True, exist_ok=True)
build_ref = f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{target}" BuildableName="Lupo.app" BlueprintName="Lupo" ReferencedContainer="container:Lupo.xcodeproj"/>'
test_ref = f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{test_target}" BuildableName="LupoUITests.xctest" BlueprintName="LupoUITests" ReferencedContainer="container:Lupo.xcodeproj"/>'
(schemes/'Lupo.xcscheme').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1600" version="1.3">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{build_ref}</BuildActionEntry><BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="YES">{test_ref}</BuildActionEntry></BuildActionEntries></BuildAction>
<TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO">{test_ref}</TestableReference></Testables></TestAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">{build_ref}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{build_ref}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>''')
print('Generated Lupo.xcodeproj with', len(sources), 'Swift sources')
