package app.lingora;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "app.lingora", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    /** The adaptive logic stays plain Java so that it is testable without Spring or a database (PRD 11.3). */
    @ArchTest
    static final ArchRule coreDependsOnlyOnJavaAndTheDomain = classes()
            .that().resideInAPackage("app.lingora.core..")
            .should().onlyDependOnClassesThat().resideInAnyPackage("java..", "app.lingora.domain..", "app.lingora.core..");

    @ArchTest
    static final ArchRule domainIsFrameworkFree = classes()
            .that().resideInAPackage("app.lingora.domain..")
            .should().onlyDependOnClassesThat().resideInAnyPackage("java..", "app.lingora.domain..", "com.fasterxml.jackson.annotation..");
}
