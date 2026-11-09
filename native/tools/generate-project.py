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
for path in sources + resources + ['Resources/Info.plist']:
    f = add(path, {'isa':'PBXFileReference', 'lastKnownFileType': 'sourcecode.swift' if path.endswith('.swift') else 'image.png' if path.endswith('.png') else 'text.plist.xml', 'path':path, 'sourceTree':'<group>'})
    files.append(f)
    add('build:'+path, {'isa':'PBXBuildFile','fileRef':f})
product = add('product', {'isa':'PBXFileReference','explicitFileType':'wrapper.application','includeInIndex':0,'path':'Lupo.app','sourceTree':'BUILT_PRODUCTS_DIR'})
products = add('products', {'isa':'PBXGroup','children':[product],'name':'Products','sourceTree':'<group>'})
group = add('group', {'isa':'PBXGroup','children':files+[products],'sourceTree':'<group>'})
source_phase = add('source-phase', {'isa':'PBXSourcesBuildPhase','buildActionMask':2147483647,'files':[ref('build:'+p) for p in sources],'runOnlyForDeploymentPostprocessing':0})
resource_phase = add('resource-phase', {'isa':'PBXResourcesBuildPhase','buildActionMask':2147483647,'files':[ref('build:'+p) for p in resources],'runOnlyForDeploymentPostprocessing':0})
framework_phase = add('framework-phase', {'isa':'PBXFrameworksBuildPhase','buildActionMask':2147483647,'files':[],'runOnlyForDeploymentPostprocessing':0})
for scope in ['project', 'target']:
    configs=[]
    for mode in ['Debug', 'Release']:
        settings = {'CLANG_ENABLE_MODULES':'YES','SWIFT_VERSION':'6.0','IPHONEOS_DEPLOYMENT_TARGET':'17.0','SDKROOT':'iphoneos','SWIFT_OPTIMIZATION_LEVEL':'-Onone' if mode == 'Debug' else '-O'}
        if scope == 'target': settings.update({'PRODUCT_NAME':'Lupo','PRODUCT_BUNDLE_IDENTIFIER':'com.chlebholdings.lupo','INFOPLIST_FILE':'Resources/Info.plist','MARKETING_VERSION':'2.0','CURRENT_PROJECT_VERSION':'1','TARGETED_DEVICE_FAMILY':'1','CODE_SIGN_STYLE':'Automatic','GENERATE_INFOPLIST_FILE':'NO','SUPPORTED_PLATFORMS':'iphoneos iphonesimulator','SUPPORTS_MACCATALYST':'NO','LD_RUNPATH_SEARCH_PATHS':'$(inherited) @executable_path/Frameworks'})
        configs.append(add(scope+mode, {'isa':'XCBuildConfiguration','buildSettings':settings,'name':mode}))
    add(scope+'configs', {'isa':'XCConfigurationList','buildConfigurations':configs,'defaultConfigurationIsVisible':0,'defaultConfigurationName':'Release'})
target = add('target', {'isa':'PBXNativeTarget','buildConfigurationList':ref('targetconfigs'),'buildPhases':[source_phase,framework_phase,resource_phase],'buildRules':[],'dependencies':[],'name':'Lupo','productName':'Lupo','productReference':product,'productType':'com.apple.product-type.application'})
project = add('project', {'isa':'PBXProject','attributes':{'LastUpgradeCheck':'1600'},'buildConfigurationList':ref('projectconfigs'),'compatibilityVersion':'Xcode 14.0','developmentRegion':'en','hasScannedForEncodings':0,'knownRegions':['en','Base'],'mainGroup':group,'productRefGroup':products,'projectDirPath':'','projectRoot':'','targets':[target]})
project_dir = root/'Lupo.xcodeproj'
project_dir.mkdir(exist_ok=True)
(project_dir/'project.pbxproj').write_text('// !$*UTF8*$!\n' + render({'archiveVersion':1,'classes':{},'objectVersion':56,'objects':objects,'rootObject':project})+'\n')
schemes = project_dir/'xcshareddata'/'xcschemes'; schemes.mkdir(parents=True, exist_ok=True)
build_ref = f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{target}" BuildableName="Lupo.app" BlueprintName="Lupo" ReferencedContainer="container:Lupo.xcodeproj"/>'
(schemes/'Lupo.xcscheme').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1600" version="1.3">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{build_ref}</BuildActionEntry></BuildActionEntries></BuildAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">{build_ref}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{build_ref}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>''')
print('Generated Lupo.xcodeproj with', len(sources), 'Swift sources')
